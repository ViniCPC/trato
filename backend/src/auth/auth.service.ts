import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bs58 from 'bs58';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyWalletDto } from './dto/verify-wallet.dto';
import { WalletChallengeDto } from './dto/wallet-challenge.dto';
import { verifyWalletProof } from './wallet-proof';

interface WalletChallenge {
  userId: string;
  walletAddress: string;
  message: string;
  expiresAt: number;
  used: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'sqlState' in error &&
    error.sqlState === '23505'
  );
}

@Injectable()
export class AuthService {
  private readonly walletChallenges = new Map<string, WalletChallenge>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async regiter(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase();
    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.orm.public.User.select(
        'id',
        'name',
        'email',
        'walletAddress',
        'createdAt',
        'updatedAt',
      ).create({ name: dto.name.trim(), email, passwordHash });

      return { accessToken: await this.jwt.signAsync({ sub: user.id }), user };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const argon2 = await import('argon2');
    const user = await this.prisma.orm.public.User.select(
      'id',
      'name',
      'email',
      'passwordHash',
      'createdAt',
      'updatedAt',
      'walletAddress',
    ).first({ email: dto.email.trim().toLowerCase() });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.orm.public.User.select(
      'id',
      'name',
      'email',
      'updatedAt',
      'walletAddress',
      'createdAt',
    ).first({ id: userId });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  createWalletChallenge(userId: string, dto: WalletChallengeDto) {
    const walletAddress = this.normalizeWalletAddress(dto.walletAddress);
    const challengeId = randomUUID();
    const expiresAt = Date.now() + 5 * 60_000;
    const message = [
      'Vincular carteira à conta Trato',
      `Usuário: ${userId}`,
      `Carteira: ${walletAddress}`,
      `Nonce: ${randomBytes(24).toString('hex')}`,
      `Expira em: ${new Date(expiresAt).toISOString()}`,
    ].join('\n');

    this.walletChallenges.set(challengeId, {
      userId,
      walletAddress,
      message,
      expiresAt,
      used: false,
    });
    this.deleteExpiredChallenges();

    return {
      challengeId,
      message,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async verifyWallet(userId: string, dto: VerifyWalletDto) {
    const challenge = this.walletChallenges.get(dto.challengeId);
    if (
      !challenge ||
      challenge.userId !== userId ||
      challenge.used ||
      challenge.expiresAt < Date.now()
    ) {
      throw new ForbiddenException('Desafio ausente, expirado ou já utilizado');
    }

    if (
      !verifyWalletProof(
        challenge.message,
        challenge.walletAddress,
        dto.signature,
      )
    ) {
      throw new ForbiddenException(
        'A assinatura não pertence à carteira informada',
      );
    }

    challenge.used = true;
    try {
      const user = await this.prisma.db.transaction(async (tx) => {
        const lockQuery = this.prisma.db.raw.sql`
          SELECT "id" FROM "public"."users"
          WHERE "id" = CAST(${userId} AS uuid)
          FOR UPDATE
        `
          .returnsRow({ id: tx.sql.public.users.columns.id })
          .build();
        await tx.query(lockQuery);

        const current = await tx.orm.public.User.where({ id: userId }).first();
        if (!current) throw new UnauthorizedException();
        if (
          current.walletAddress &&
          current.walletAddress !== challenge.walletAddress
        ) {
          const clientProjects = await tx.orm.public.Project.where({
            clientId: userId,
          })
            .select('id')
            .all();
          const freelancerProjects = await tx.orm.public.Project.where({
            freelancerId: userId,
          })
            .select('id')
            .all();
          for (const project of [...clientProjects, ...freelancerProjects]) {
            const milestones = await tx.orm.public.Milestone.where({
              projectId: project.id,
            })
              .select('status')
              .all();
            if (
              milestones.some(
                (milestone) =>
                  milestone.status === 'funded' ||
                  milestone.status === 'submitted',
              )
            ) {
              throw new ConflictException(
                'Não é possível trocar a carteira enquanto houver etapas financiadas ou submetidas',
              );
            }
          }
        }

        return tx.orm.public.User.select(
          'id',
          'name',
          'email',
          'walletAddress',
          'createdAt',
          'updatedAt',
        )
          .where({ id: userId })
          .update({ walletAddress: challenge.walletAddress });
      });
      if (!user) throw new UnauthorizedException();
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Carteira já vinculada a outra conta');
      }
      throw error;
    }
  }

  private normalizeWalletAddress(value: string): string {
    const address = value.trim();
    try {
      const decoded = bs58.decode(address);
      if (decoded.length !== 32 || bs58.encode(decoded) !== address) {
        throw new Error('invalid address');
      }
      return address;
    } catch {
      throw new BadRequestException('Endereço Solana inválido');
    }
  }

  private deleteExpiredChallenges(): void {
    const now = Date.now();
    for (const [id, challenge] of this.walletChallenges) {
      if (challenge.used || challenge.expiresAt < now) {
        this.walletChallenges.delete(id);
      }
    }
  }
}
