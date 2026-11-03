-- =====================================================================
-- Conecta CEFET - MIGRAÇÃO
-- Rode DEPOIS do script original do banco (conecta_cefet).
-- Não altera nenhuma tabela existente. Pode ser executado mais de uma vez.
-- =====================================================================

USE conecta_cefet;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Garantia: tabelas de interesses/habilidades do professor
-- (o arquivo original foi cortado nesse ponto; IF NOT EXISTS não duplica)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professor_interesse (
    id_usuario BIGINT UNSIGNED NOT NULL,
    id_area INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_usuario, id_area),
    CONSTRAINT fk_profint_prof FOREIGN KEY (id_usuario)
        REFERENCES professor (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_profint_area FOREIGN KEY (id_area)
        REFERENCES area_conhecimento (id_area) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS professor_habilidade (
    id_usuario BIGINT UNSIGNED NOT NULL,
    id_habilidade INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_usuario, id_habilidade),
    CONSTRAINT fk_profhab_prof FOREIGN KEY (id_usuario)
        REFERENCES professor (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_profhab_hab FOREIGN KEY (id_habilidade)
        REFERENCES habilidade (id_habilidade) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- NOVA 1: publicações do projeto (antes ficavam só no localStorage)
-- midia: JSON em texto -> [{"id","tipo","nome","url"}]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atividade_post (
    id_post BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_atividade BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    texto TEXT NULL,
    midia LONGTEXT NULL,
    eh_vaga BOOLEAN NOT NULL DEFAULT FALSE,
    vagas SMALLINT UNSIGNED NULL,
    data_publicacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_post_atividade FOREIGN KEY (id_atividade)
        REFERENCES atividade_academica (id_atividade) ON DELETE CASCADE,
    CONSTRAINT fk_post_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_post_atividade_data
    ON atividade_post (id_atividade, data_publicacao DESC);

-- ---------------------------------------------------------------------
-- NOVA 2: quem ativou notificações de um projeto
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atividade_seguidor (
    id_atividade BIGINT UNSIGNED NOT NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    data_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_atividade, id_usuario),

    CONSTRAINT fk_seguidor_atividade FOREIGN KEY (id_atividade)
        REFERENCES atividade_academica (id_atividade) ON DELETE CASCADE,
    CONSTRAINT fk_seguidor_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- DADOS: calendário do ano atual
-- ---------------------------------------------------------------------
INSERT IGNORE INTO calendario_academico (ano_letivo) VALUES ('2026');

-- ---------------------------------------------------------------------
-- DADOS: primeiro administrador
--   e-mail: admin@conecta.cefet
--   senha:  Admin@123      (TROQUE depois de entrar: ver README)
-- O hash abaixo é bcrypt (o login usa bcrypt.compare).
-- ---------------------------------------------------------------------
INSERT INTO usuario (nome, email, senha_hash, tipo_usuario)
SELECT 'Administrador Conecta', 'admin@conecta.cefet',
       '$2b$10$kefoygUtOw.tXt009D4.5Ox/dzAJNP.QdoJUk5JleMxVme0dhTAga',
       'administrador'
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'admin@conecta.cefet');

INSERT IGNORE INTO administrador (id_usuario, setor, nivel_acesso)
SELECT id_usuario, 'Coordenação', 3
FROM usuario
WHERE email = 'admin@conecta.cefet';

-- ---------------------------------------------------------------------
-- NOVA 3: recuperação de senha (RF005). Guarda só o hash do token.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recuperacao_senha (
    id_recuperacao BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expira_em DATETIME NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_recuperacao_token UNIQUE (token_hash),
    CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- NOVA 5: log de atividades do sistema (RNF004)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_atividade (
    id_log BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NULL,
    acao VARCHAR(60) NOT NULL,
    entidade VARCHAR(40) NULL,
    id_entidade VARCHAR(40) NULL,
    detalhe VARCHAR(255) NULL,
    data_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_log_data ON log_atividade (data_registro DESC);

-- ---------------------------------------------------------------------
-- NOVA 6: ano letivo (RF - Gestão do Ano Letivo e Calendário Acadêmico)
--   ano_letivo: ano vigente com início/fim das aulas
--   periodo_letivo: períodos semestrais e recessos institucionais
-- (sem FK para calendario_academico: o ano é a chave natural)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ano_letivo (
    ano CHAR(4) NOT NULL PRIMARY KEY,
    inicio_aulas DATE NOT NULL,
    fim_aulas DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS periodo_letivo (
    id_periodo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ano CHAR(4) NOT NULL,
    tipo VARCHAR(20) NOT NULL,            -- 'semestre' | 'recesso'
    titulo VARCHAR(150) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,

    CONSTRAINT fk_periodo_ano FOREIGN KEY (ano)
        REFERENCES ano_letivo (ano) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_periodo_ano ON periodo_letivo (ano, data_inicio);

-- ---------------------------------------------------------------------
-- NOVA 7: agenda pessoal do aluno (lembretes e prazos próprios,
-- sobrepostos ao calendário oficial sem alterá-lo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agenda_pessoal (
    id_item BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NULL,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_agendapessoal_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_agendapessoal_usuario ON agenda_pessoal (id_usuario, data_inicio);

-- ---------------------------------------------------------------------
-- NOVA 8: linha do tempo EDITÁVEL do projeto (ano + o que aconteceu).
-- Substitui o registro automático a cada alteração (atividade_timeline
-- continua existindo, mas deixou de ser alimentada).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atividade_historico (
    id_historico BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_atividade BIGINT UNSIGNED NOT NULL,
    ano SMALLINT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historico_atividade FOREIGN KEY (id_atividade)
        REFERENCES atividade_academica (id_atividade) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_historico_atividade_ano
    ON atividade_historico (id_atividade, ano DESC);

-- ---------------------------------------------------------------------
-- NOVA 9: autoria dos eventos institucionais criados por professores
-- (cada professor só altera/remove os eventos que ele mesmo criou).
-- Sem FK para evento_academico: o id do evento é a chave natural.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evento_autor (
    id_evento BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,

    CONSTRAINT fk_eventoautor_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
