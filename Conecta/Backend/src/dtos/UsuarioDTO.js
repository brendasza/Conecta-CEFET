// "tipo" do front: aluno | funcionario (professor) | administrador
export function paraUsuarioDTO(usuario, perfil = {}) {
  const base = {
    id: usuario.id_usuario,
    nome: usuario.nome,
    email: usuario.email,
    bio: usuario.bio ?? "",
    interesses: perfil.interesses ?? [],
    habilidades: perfil.habilidades ?? [],
  };

  if (usuario.tipo_usuario === "aluno") {
    return {
      ...base,
      tipo: "aluno",
      matricula: perfil.matricula,
      curso: perfil.curso,
      periodo: perfil.periodo,
    };
  }

  if (usuario.tipo_usuario === "administrador") {
    return {
      ...base,
      tipo: "administrador",
      setor: perfil.setor,
      nivelAcesso: perfil.nivel_acesso,
    };
  }

  return {
    ...base,
    tipo: "funcionario",
    siape: perfil.siape,
    departamento: perfil.departamento,
    titulacao: perfil.titulacao,
    areaAtuacao: perfil.area_atuacao,
  };
}
