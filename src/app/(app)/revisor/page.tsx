import RevisorTextos from "@/components/revisor-textos";

export default function RevisorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Revisor de textos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cole ou digite o texto e a IA corrige ortografia, gramática e pontuação, melhora a redação
          ou adapta a linguagem — com a lista de cada alteração feita.
        </p>
      </div>
      <RevisorTextos />
    </div>
  );
}
