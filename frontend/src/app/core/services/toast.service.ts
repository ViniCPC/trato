import { Injectable, computed, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messagesState = signal<ToastMessage[]>([]);
  private nextId = 1;

  readonly messages = this.messagesState.asReadonly();
  readonly hasMessages = computed(() => this.messagesState().length > 0);

  show(
    title: string,
    options: { description?: string; tone?: ToastTone; duration?: number } = {},
  ): void {
    const id = this.nextId++;
    const message: ToastMessage = {
      id,
      title,
      description: options.description,
      tone: options.tone ?? 'info',
    };

    this.messagesState.update((messages) => [...messages, message]);
    window.setTimeout(() => this.dismiss(id), options.duration ?? 5000);
  }

  dismiss(id: number): void {
    this.messagesState.update((messages) => messages.filter((message) => message.id !== id));
  }
}
