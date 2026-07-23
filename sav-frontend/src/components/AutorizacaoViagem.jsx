/**
 * AutorizacaoViagem.jsx — Documento "Autorização de Viagem Nacional (AV)" no
 * layout do SDP, gerado a partir dos dados da viagem. Botão Imprimir gera o PDF
 * (impressão do navegador). Usa os estilos .sdp-* e a regra de impressão .av-doc.
 */
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');
const ORDENADOR = { unidade: 'CNPMF', unidadeGestora: '135014 - CNPMF', chefe: 'FRANCISCO FERRAZ LARANJEIRA BARBOSA' };

export default function AutorizacaoViagem({ trip, onClose }) {
  const fav = trip.beneficiaries[0] || {};
  const totalDiarias = trip.beneficiaries.reduce(
    (acc, b) => acc + Number(b.daily_quantity || 0) * Number(b.daily_rate || 0), 0);
  const totalOutros = (trip.advances || []).reduce((acc, a) => acc + Number(a.value || 0), 0);
  const totalAV = totalDiarias + totalOutros;
  const hoje = new Date().toLocaleDateString('pt-BR');

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={() => window.print()}>Imprimir / PDF</button>
        <button className="btn quiet" onClick={onClose}>Fechar</button>
      </div>

      <div className="av-doc sdp-form" style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Cabeçalho */}
        <div className="sdp-appbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="sdp-logo">Emb<span>rapa</span></div>
            <div style={{ fontSize: 11, color: '#333' }}>
              Centro Nacional de Pesquisa de<br />Mandioca e Fruticultura Tropical
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11 }}>
            <div>Identificação: <strong>{trip.request_number}</strong></div>
            <div>Emissão: {fmt(trip.created_at)}</div>
            <div>Empregado</div>
          </div>
        </div>
        <div className="sdp-band">AUTORIZAÇÃO DE VIAGEM NACIONAL - AV</div>

        {/* Favorecido */}
        <div className="sdp-group">
          <div className="sdp-group-h">Favorecido</div>
          <div className="sdp-row"><div className="lbl">Nome:</div><div className="val plain">{fav.full_name || '—'}</div></div>
          <div className="sdp-row"><div className="lbl">Matrícula / CPF:</div>
            <div className="val plain">{fav.registration_number || '—'} / {fav.cpf || '—'}</div></div>
          <div className="sdp-row"><div className="lbl">Cargo:</div><div className="val plain">{fav.position || '—'}</div></div>
          <div className="sdp-row"><div className="lbl">Unidade:</div><div className="val plain">{ORDENADOR.unidade}</div></div>
          <div className="sdp-row"><div className="lbl">Dados Bancários:</div><div className="val plain">{fav.bank_info || '—'}</div></div>
        </div>

        {/* Ordenador / Custo */}
        <div className="sdp-group">
          <div className="sdp-group-h">Ordenador da Despesa</div>
          <div className="sdp-row"><div className="lbl">Unidade Gestora:</div><div className="val plain">{ORDENADOR.unidadeGestora}</div></div>
          <div className="sdp-row"><div className="lbl">Ordenador:</div><div className="val plain">{ORDENADOR.chefe}</div></div>
          <div className="sdp-row"><div className="lbl">Ônus:</div><div className="val plain">{trip.cost_type_display || '—'}</div></div>
          {trip.research_activity_detail && (
            <div className="sdp-row"><div className="lbl">Plano de Ação:</div>
              <div className="val plain">{trip.research_activity_detail.code} — {trip.research_activity_detail.description}</div></div>
          )}
        </div>

        {/* Dados da viagem */}
        <div className="sdp-group">
          <div className="sdp-group-h">Dados da Viagem</div>
          <div className="sdp-row"><div className="lbl">Meio de Transporte:</div><div className="val plain">{trip.transport_means_display || '—'}</div></div>
          <div className="sdp-row"><div className="lbl">Período:</div><div className="val plain">{fmt(trip.departure_date)} a {fmt(trip.return_date)}</div></div>
          <div className="sdp-row"><div className="lbl">Roteiro:</div><div className="val plain">{trip.itinerary || '—'}</div></div>
          <div className="sdp-row"><div className="lbl">Descrição:</div><div className="val plain">{trip.objective || '—'}</div></div>
          {trip.observations && (<div className="sdp-row"><div className="lbl">Observação:</div><div className="val plain">{trip.observations}</div></div>)}
        </div>

        {/* Diárias */}
        <div className="sdp-band">Diárias</div>
        <table className="sdp-table" style={{ marginTop: 6 }}>
          <thead>
            <tr><th>Cidade</th><th>Início</th><th>Término</th><th>Qtd. Dias</th><th>Fator</th><th>Valor Base (R$)</th><th>Valor Total (R$)</th></tr>
          </thead>
          <tbody>
            {trip.beneficiaries.map((b) => (
              <tr key={b.id}>
                <td>{b.city || '—'}</td>
                <td className="num">{fmt(b.start_date)}</td>
                <td className="num">{fmt(b.end_date)}</td>
                <td className="num">{Number(b.daily_quantity).toLocaleString('pt-BR')}</td>
                <td className="num">1</td>
                <td className="num">{money(b.daily_rate)}</td>
                <td className="num">{money(Number(b.daily_quantity) * Number(b.daily_rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Outros Adiantamentos */}
        {(trip.advances || []).length > 0 && (
          <>
            <div className="sdp-band">Outros Adiantamentos</div>
            <table className="sdp-table" style={{ marginTop: 6 }}>
              <thead><tr><th>Tipo</th><th>Justificativa</th><th>Valor (R$)</th></tr></thead>
              <tbody>
                {trip.advances.map((a) => (
                  <tr key={a.id}>
                    <td>{a.nature_display}</td>
                    <td>{a.justification || '—'}</td>
                    <td className="num">{money(a.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Totais */}
        <div className="sdp-group" style={{ marginTop: 10 }}>
          <div className="sdp-row"><div className="lbl">Adiantamento de Diárias:</div><div className="val plain">{money(totalDiarias)}</div></div>
          <div className="sdp-row"><div className="lbl">Outros Adiantamentos:</div><div className="val plain">{money(totalOutros)}</div></div>
          <div className="sdp-row"><div className="lbl">TOTAL DA AV:</div><div className="val plain"><strong>{money(totalAV)}</strong></div></div>
        </div>

        <div style={{ padding: 12, fontSize: 11, color: '#444', borderTop: '1px solid #c4d2df' }}>
          <strong>Termo de Compromisso:</strong> o favorecido desta viagem autoriza o desconto do total
          da Solicitação de Viagem em folha de pagamento em caso de atraso na prestação de contas.
          <div style={{ marginTop: 8 }}>Impresso em: {hoje}</div>
        </div>
      </div>
    </div>
  );
}
