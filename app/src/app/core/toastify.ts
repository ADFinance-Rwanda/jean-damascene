// services/notification.service.ts
import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

export interface ToastOptions {
  title?: string;
  text: string;
  type?: AlertType;
  timer?: number;
  position?: SweetAlertOptions['position'];
  showConfirmButton?: boolean;
}

export interface AlertOptions extends ToastOptions {
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  /* ---------- TOAST NOTIFICATIONS ---------- */

  // Success toast (auto-closes)
  success(text: string, title: string = 'Success'): Promise<SweetAlertResult> {
    return this.toast(text, title, 'success');
  }

  // Error toast (auto-closes)
  error(text: string, title: string = 'Error'): Promise<SweetAlertResult> {
    return this.toast(text, title, 'error');
  }

  // Info toast (auto-closes)
  info(text: string, title: string = 'Info'): Promise<SweetAlertResult> {
    return this.toast(text, title, 'info');
  }

  // Warning toast (auto-closes)
  warning(text: string, title: string = 'Warning'): Promise<SweetAlertResult> {
    return this.toast(text, title, 'warning');
  }

  // Generic toast method
  toast(
    text: string,
    title: string = '',
    type: AlertType = 'info',
    timer: number = 3000
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: type,
      timer,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      timerProgressBar: true,
      showClass: {
        popup: 'swal2-noanimation',
        backdrop: 'swal2-noanimation',
      },
      hideClass: {
        popup: '',
        backdrop: '',
      },
    });
  }

  /* ---------- ALERT DIALOGS ---------- */

  // Success alert (requires click to close)
  successAlert(text: string, title: string = 'Success'): Promise<SweetAlertResult> {
    return this.alert(text, title, 'success');
  }

  // Error alert (requires click to close)
  errorAlert(text: string, title: string = 'Error'): Promise<SweetAlertResult> {
    return this.alert(text, title, 'error');
  }

  // Info alert (requires click to close)
  infoAlert(text: string, title: string = 'Info'): Promise<SweetAlertResult> {
    return this.alert(text, title, 'info');
  }

  // Warning alert (requires click to close)
  warningAlert(text: string, title: string = 'Warning'): Promise<SweetAlertResult> {
    return this.alert(text, title, 'warning');
  }

  // Generic alert method
  alert(
    text: string,
    title: string = '',
    type: AlertType = 'info',
    confirmButtonText: string = 'OK'
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: type,
      confirmButtonText,
      confirmButtonColor: this.getConfirmButtonColor(type),
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
  }

  /* ---------- CONFIRMATION DIALOGS ---------- */

  // Confirm with custom text
  confirm(
    text: string,
    title: string = 'Are you sure?',
    type: AlertType = 'warning'
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: type,
      showCancelButton: true,
      confirmButtonColor: this.getConfirmButtonColor(type),
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });
  }

  // Delete confirmation (common use case)
  confirmDelete(itemName: string, itemType: string = 'item'): Promise<SweetAlertResult> {
    return Swal.fire({
      title: 'Delete Confirmation',
      text: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false,
    });
  }

  /* ---------- CUSTOM DIALOGS ---------- */

  // Custom dialog with full options
  custom(options: SweetAlertOptions): Promise<SweetAlertResult> {
    const defaultOptions: SweetAlertOptions = {
      confirmButtonColor: '#007bff',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false,
    };

    return Swal.fire({ ...defaultOptions, ...options } as SweetAlertOptions);
  }

  /* ---------- PROMPTS ---------- */

  // Input prompt
  async prompt(
    title: string,
    inputPlaceholder: string = '',
    inputValue: string = '',
    type: AlertType = 'question'
  ): Promise<string | null> {
    const result = await Swal.fire({
      title,
      input: 'text',
      inputPlaceholder,
      inputValue,
      icon: type,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false,
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter a value';
        }
        return null;
      },
    });

    return result.isConfirmed ? result.value : null;
  }

  /* ---------- HELPER METHODS ---------- */

  private getConfirmButtonColor(type: AlertType): string {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      question: '#007bff',
    };
    return colors[type] || '#007bff';
  }

  // Close all active SweetAlert2 modals
  closeAll(): void {
    Swal.close();
  }

  // Check if any SweetAlert2 modal is open
  isOpen(): boolean {
    return Swal.isVisible();
  }
}
