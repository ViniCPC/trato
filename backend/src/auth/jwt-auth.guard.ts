import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string };
    }>();

    const match = /^Bearer ([^\s]+)$/.exec(
      request.headers.authorization ?? '',
    );

    if (!match) {
      throw new UnauthorizedException('Token não informado');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: unknown }>(match[1]);

      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException();
      }

      request.user = { id: payload.sub };

      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}