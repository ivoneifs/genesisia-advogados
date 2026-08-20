import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const superadmin = await prisma.user.findUnique({
    where: { email: "admin@genesisia.com.br" },
  });
  if (!superadmin) {
    await prisma.user.create({
      data: {
        name: "Administrador Genesis IA",
        email: "admin@genesisia.com.br",
        password: await bcrypt.hash("admin123", 10),
        role: "SUPERADMIN",
      },
    });
    console.log(
      "Superadmin criado: admin@genesisia.com.br / admin123 — troque a senha depois do primeiro login."
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: "demo@genesisia.com.br" },
  });

  let user = existing;
  let escritorio = existing
    ? await prisma.escritorio.findUnique({ where: { id: existing.escritorioId } })
    : null;

  if (!existing) {
    escritorio = await prisma.escritorio.create({
      data: { nome: "Escritório Demo" },
    });
    user = await prisma.user.create({
      data: {
        name: "Dra. Ana Beatriz",
        email: "demo@genesisia.com.br",
        password: await bcrypt.hash("demo123", 10),
        escritorioId: escritorio.id,
      },
    });
  }

  const escritorioId = escritorio.id;

  const clientesCount = await prisma.cliente.count({ where: { escritorioId } });
  if (clientesCount > 0) {
    console.log("Dados de exemplo já existem, pulando seed.");
    return;
  }

  const clienteA = await prisma.cliente.create({
    data: {
      nome: "João Pedro Almeida",
      tipo: "PF",
      documento: "123.456.789-00",
      email: "joao.almeida@email.com",
      telefone: "(11) 98888-1234",
      endereco: "Rua das Acácias, 120 - São Paulo/SP",
      escritorioId,
    },
  });

  const clienteB = await prisma.cliente.create({
    data: {
      nome: "Comércio Silva & Filhos Ltda",
      tipo: "PJ",
      documento: "12.345.678/0001-90",
      email: "financeiro@silvaefilhos.com.br",
      telefone: "(11) 3222-4455",
      endereco: "Av. Paulista, 900 - São Paulo/SP",
      escritorioId,
    },
  });

  const processo1 = await prisma.processo.create({
    data: {
      numero: "1002345-67.2025.8.26.0100",
      area: "Cível",
      status: "ATIVO",
      tribunal: "TJSP",
      vara: "3ª Vara Cível Central",
      parteContraria: "Seguradora Nacional S.A.",
      valorCausa: 45000,
      descricao: "Ação de indenização por danos materiais.",
      clienteId: clienteA.id,
      responsavelId: user.id,
      escritorioId,
    },
  });

  const processo2 = await prisma.processo.create({
    data: {
      numero: "0004521-88.2024.5.02.0032",
      area: "Trabalhista",
      status: "ATIVO",
      tribunal: "TRT-2",
      vara: "32ª Vara do Trabalho",
      parteContraria: "Comércio Silva & Filhos Ltda (ex-funcionário)",
      valorCausa: 18500,
      descricao: "Reclamação trabalhista - horas extras.",
      clienteId: clienteB.id,
      responsavelId: user.id,
      escritorioId,
    },
  });

  await prisma.prazo.createMany({
    data: [
      {
        titulo: "Apresentar contestação",
        descricao: "Prazo para contestar a ação",
        dataVencimento: daysFromNow(2),
        prioridade: "ALTA",
        processoId: processo1.id,
        responsavelId: user.id,
        escritorioId,
      },
      {
        titulo: "Protocolar réplica",
        dataVencimento: daysFromNow(7),
        prioridade: "NORMAL",
        processoId: processo1.id,
        responsavelId: user.id,
        escritorioId,
      },
      {
        titulo: "Audiência de instrução",
        dataVencimento: daysFromNow(-1),
        prioridade: "ALTA",
        status: "PENDENTE",
        processoId: processo2.id,
        responsavelId: user.id,
        escritorioId,
      },
    ],
  });

  await prisma.tarefa.createMany({
    data: [
      {
        titulo: "Ligar para João Pedro sobre documentos",
        data: daysFromNow(0),
        tipo: "TAREFA",
        processoId: processo1.id,
        responsavelId: user.id,
        escritorioId,
      },
      {
        titulo: "Audiência de instrução - TRT-2",
        data: daysFromNow(3),
        tipo: "AUDIENCIA",
        processoId: processo2.id,
        responsavelId: user.id,
        escritorioId,
      },
      {
        titulo: "Reunião com Comércio Silva & Filhos",
        data: daysFromNow(5),
        tipo: "REUNIAO",
        processoId: processo2.id,
        responsavelId: user.id,
        escritorioId,
      },
    ],
  });

  await prisma.financeiro.createMany({
    data: [
      {
        tipo: "RECEITA",
        descricao: "Honorários iniciais - João Pedro",
        valor: 3500,
        vencimento: daysFromNow(-10),
        status: "PAGO",
        clienteId: clienteA.id,
        processoId: processo1.id,
        escritorioId,
      },
      {
        tipo: "RECEITA",
        descricao: "Honorários de êxito - Comércio Silva",
        valor: 6200,
        vencimento: daysFromNow(15),
        status: "PENDENTE",
        clienteId: clienteB.id,
        processoId: processo2.id,
        escritorioId,
      },
      {
        tipo: "DESPESA",
        descricao: "Custas processuais - TJSP",
        valor: 480,
        vencimento: daysFromNow(-5),
        status: "PAGO",
        processoId: processo1.id,
        escritorioId,
      },
    ],
  });

  console.log("Seed concluído. Login demo: demo@genesisia.com.br / demo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
