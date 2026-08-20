import ClienteForm from "@/components/cliente-form";
import { createCliente } from "@/lib/actions/clientes";

export default function NovoClientePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo cliente</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre um novo cliente do escritório.
        </p>
      </div>
      <ClienteForm action={createCliente} />
    </div>
  );
}
