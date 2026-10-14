// Contato comercial e de suporte (WhatsApp).
export const WHATSAPP_NUMERO = "5574988259925";
export const whatsapp = (mensagem: string) =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

export const SUPORTE_WHATSAPP = whatsapp(
  "Olá! Preciso incluir ou alterar uma OAB do meu escritório no Genesis IA."
);
