import { redirect } from "next/navigation";

// Rota antiga: a gestão de escritórios/usuários agora vive em /admin/escritorios.
export default function AdminUsuariosLegacy() {
  redirect("/admin/escritorios");
}
