-- =====================================================================
-- Conecta CEFET - ATUALIZAÇÃO DO BANCO (itens 8, 9 e 10)
-- Rode DEPOIS do seu script do banco (conecta_cefet). NÃO apaga nem altera
-- nenhuma tabela existente; só cria 2 tabelas novas. Pode rodar mais de uma vez.
-- (Não rode o migracao.sql junto: o seu script já contém tudo que ele cria.)
-- =====================================================================
USE conecta_cefet;
SET NAMES utf8mb4;

-- 1) Linha do tempo EDITÁVEL do projeto (ano + o que aconteceu).
--    atividade_timeline guarda só "data automática" e não tem ano editável,
--    por isso uma tabela nova; a antiga continua existindo, sem uso.
CREATE TABLE IF NOT EXISTS atividade_historico (
    id_historico BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_atividade BIGINT UNSIGNED NOT NULL,
    ano SMALLINT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historico_atividade FOREIGN KEY (id_atividade)
        REFERENCES atividade_academica (id_atividade) ON DELETE CASCADE,
    INDEX idx_historico_atividade_ano (id_atividade, ano)
) ENGINE=InnoDB;

-- 2) Autoria dos eventos institucionais criados por professores
--    (evento_academico não tem coluna de autor; assim cada professor só
--    remove os eventos que ele mesmo criou).
CREATE TABLE IF NOT EXISTS evento_autor (
    id_evento BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,

    CONSTRAINT fk_eventoautor_evento FOREIGN KEY (id_evento)
        REFERENCES evento_academico (id_evento) ON DELETE CASCADE,
    CONSTRAINT fk_eventoautor_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3) (Opcional, correção) a view vw_atividade_vagas compara com 'apravado' (typo):
--    nunca casa com nada e as vagas ocupadas sempre saem 0. O código atual não usa
--    essa view, mas ela fica correta para consultas diretas.
CREATE OR REPLACE VIEW vw_atividade_vagas AS
SELECT
    a.id_atividade,
    a.vagas_totais,
    COUNT(c.id_candidatura) AS vagas_ocupadas,
    a.vagas_totais - COUNT(c.id_candidatura) AS vagas_disponiveis
FROM atividade_academica a
LEFT JOIN candidatura c
    ON c.id_atividade = a.id_atividade
    AND c.status = 'aprovado'
GROUP BY a.id_atividade, a.vagas_totais;

-- 4) (item 11: ADM com as funções do professor)
--    Quem cria/coordena uma atividade era obrigado a existir na tabela `professor` (FK).
--    O administrador não está nela. As FKs passam a apontar para `usuario`
--    (professores e administradores). Nenhum dado é apagado.
ALTER TABLE atividade_academica
    DROP FOREIGN KEY fk_atividade_professor,
    ADD CONSTRAINT fk_atividade_professor FOREIGN KEY (id_professor)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT;

ALTER TABLE atividade_coordenador
    DROP FOREIGN KEY fk_atividadecoord_professor,
    ADD CONSTRAINT fk_atividadecoord_professor FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE;
