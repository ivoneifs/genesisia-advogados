import { redirect } from "next/navigation";

// O tutorial em vídeo fica na seção "Como funciona" da landing.
export default function TutorialPage() {
  redirect("/#como-funciona");
}
