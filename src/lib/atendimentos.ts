// Canais e situações de atendimento (valores gravados em Atendimento.tipo/status).

export const TIPOS_ATENDIMENTO = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "TELEFONE", label: "Telefone" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "E-mail" },
  { value: "VIDEO", label: "Videochamada" },
] as const;

export const STATUS_ATENDIMENTO = [
  { value: "ABERTO", label: "Aberto" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export function labelTipo(value: string) {
  return TIPOS_ATENDIMENTO.find((t) => t.value === value)?.label ?? value;
}

export function labelStatus(value: string) {
  return STATUS_ATENDIMENTO.find((s) => s.value === value)?.label ?? value;
}

export function tipoValido(value: string) {
  return TIPOS_ATENDIMENTO.some((t) => t.value === value) ? value : "PRESENCIAL";
}

export function statusValido(value: string) {
  return STATUS_ATENDIMENTO.some((s) => s.value === value) ? value : "CONCLUIDO";
}
