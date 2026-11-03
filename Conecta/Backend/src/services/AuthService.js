import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import * as PerfilRepository from "../repositories/PerfilRepository.js";

const TIPOS_CADASTRO = {
  aluno: "aluno",
  funcionario: "professor",
  professor: "professor",
};

export async function cadastrar(dados) {
  const { nome, email, senha } = dados;
  const tipo_usuario = TIPOS_CADASTRO[dados.tipo ?? dados.tipo_usuario];

  if (!nome || !email || !senha || !tipo_usuario) {
    throw new Error("DADOS_INVALIDOS");
  }

  if (
    tipo_usuario === "aluno" &&
    !(dados.matricula && dados.curso && dados.periodo)
  ) {
    throw new Error("DADOS_INVALIDOS");
  }

  if (
    tipo_usuario === "professor" &&
    !(dados.siape && dados.departamento && dados.titulacao && dados.areaAtuacao)
  ) {
    throw new Error("DADOS_INVALIDOS");
  }

  const existente = await UsuarioRepository.buscarPorEmail(email);

  if (existente) {
    throw new Error("EMAIL_JA_CADASTRADO");
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  // Transação: ou salva usuario + aluno/professor, ou não salva nada.
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    const id = await UsuarioRepository.criar(
      { nome, email, senha_hash, tipo_usuario },
      conexao
    );

    if (tipo_usuario === "aluno") {
      await UsuarioRepository.criarAluno(
        {
          id_usuario: id,
          matricula: dados.matricula,
          curso: dados.curso,
          periodo: dados.periodo,
        },
        conexao
      );
    } else {
      await UsuarioRepository.criarProfessor(
        {
          id_usuario: id,
          siape: dados.siape,
          departamento: dados.departamento,
          titulacao: dados.titulacao,
          area_atuacao: dados.areaAtuacao,
        },
        conexao
      );
    }

    await conexao.commit();
    return id;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function login({ email, senha }) {
  if (!email || !senha) {
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  const usuario = await UsuarioRepository.buscarPorEmail(email);

  if (!usuario || !usuario.ativo) {
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

  if (!senhaCorreta) {
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  const token = jwt.sign(
    { id: usuario.id_usuario, tipo: usuario.tipo_usuario },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  const perfil = await PerfilRepository.buscar(usuario);

  return { token, usuario, perfil };
}