// Nombre legible de cada email transaccional. Vive fuera de los componentes
// porque lo usan el índice y la pantalla de detalle, y el título de la pantalla
// tiene que decir exactamente lo mismo que la fila desde la que se llegó.
export const TX_TEMPLATE_LABELS: Record<string, string> = {
  welcome: 'Bienvenida + verificación',
  password_reset: 'Recuperar contraseña',
  parental_consent: 'Consentimiento parental',
};

/** Remitente real de los correos, tal como lo ve el destinatario en su bandeja. */
export const EMAIL_SENDER = 'Kodi <soporte@holakodi.com>';
