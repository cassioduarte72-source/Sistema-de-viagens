"""
apps/accountability/pdf.py — Geração do PDF da Prestação de Contas (PCV),
no formato do documento do SDP, para o favorecido subir no processo SEI.
"""
from decimal import Decimal
from datetime import timedelta
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
)

from core.models import SystemConfig

AZUL = colors.HexColor('#dbe7f1')
BORDA = colors.HexColor('#9db8cc')
CINZA = colors.HexColor('#f2f4f6')

_ESTILO = ParagraphStyle('cell', fontName='Helvetica', fontSize=8, leading=10)
_ESTILO_B = ParagraphStyle('cellB', fontName='Helvetica-Bold', fontSize=8, leading=10)


def _money(v):
    s = f'{Decimal(str(v or 0)):,.2f}'
    return 'R$ ' + s.replace(',', 'X').replace('.', ',').replace('X', '.')


def _fmt(d):
    return d.strftime('%d/%m/%Y') if d else '—'


def _p(txt, bold=False):
    return Paragraph(str(txt if txt not in (None, '') else '—'), _ESTILO_B if bold else _ESTILO)


def _banda(titulo):
    """Faixa de seção (cabeçalho azul, largura total)."""
    t = Table([[_p(titulo, bold=True)]], colWidths=[180 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), AZUL),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDA),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def _kv(linhas):
    """Tabela rótulo→valor (2 colunas)."""
    dados = [[_p(k, bold=True), _p(v)] for k, v in linhas]
    t = Table(dados, colWidths=[45 * mm, 135 * mm])
    t.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.4, BORDA),
        ('BACKGROUND', (0, 0), (0, -1), CINZA),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return t


def _grade(cabecalho, linhas, larguras, aligns=None):
    dados = [[_p(c, bold=True) for c in cabecalho]] + [
        [_p(c) for c in linha] for linha in linhas
    ]
    t = Table(dados, colWidths=larguras)
    estilo = [
        ('GRID', (0, 0), (-1, -1), 0.4, BORDA),
        ('BACKGROUND', (0, 0), (-1, 0), AZUL),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]
    for col, al in (aligns or {}).items():
        estilo.append(('ALIGN', (col, 0), (col, -1), al))
    t.setStyle(TableStyle(estilo))
    return t


def build_pcv_pdf(report):
    """Monta e retorna os bytes do PDF da PCV."""
    trip = report.travel_request
    b = trip.beneficiaries.first()
    prazo = int(SystemConfig.get_value('PCV_DEADLINE_DAYS', '5'))
    vencimento = (trip.return_date + timedelta(days=prazo)) if trip.return_date else None

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, topMargin=14 * mm, bottomMargin=14 * mm,
        leftMargin=15 * mm, rightMargin=15 * mm,
        title=f'PCV {trip.request_number}',
    )
    el = []

    # Cabeçalho
    titulo = ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=13, alignment=1)
    sub = ParagraphStyle('s', fontName='Helvetica', fontSize=9, alignment=1)
    el.append(Paragraph('PRESTAÇÃO DE CONTAS DE VIAGEM — PCV', titulo))
    el.append(Paragraph('Embrapa — Centro Nacional de Pesquisa de Mandioca e Fruticultura Tropical (CNPMF)', sub))
    el.append(Paragraph(f'Solicitação de Viagem: {trip.request_number} · Situação: {report.get_status_display()}', sub))
    el.append(Spacer(1, 6))

    # Favorecido
    el.append(_banda('Favorecido'))
    el.append(_kv([
        ('Nome / Matrícula / CPF', f'{(b.full_name if b else trip.requester.full_name)} / '
                                   f'{(b.registration_number if b else "—")} / {(b.cpf if b else "—")}'),
        ('Cargo / Unidade', f'{(b.position if b else "—")} / CNPMF'),
        ('Dados Bancários', (b.bank_info if b else '—')),
    ]))
    el.append(Spacer(1, 5))

    # Dados da viagem
    el.append(_banda('Dados da Viagem'))
    el.append(_kv([
        ('Período', f'{_fmt(trip.departure_date)} a {_fmt(trip.return_date)}'),
        ('Roteiro', trip.itinerary),
        ('Objetivo / Descrição', trip.objective),
        ('Processo SEI', trip.sei_process),
        ('Empenho (AV)', trip.commitment_number),
        ('Empenho (PCV)', report.commitment_number),
        ('Vencimento da PCV', _fmt(vencimento)),
    ]))
    el.append(Spacer(1, 5))

    # Diárias
    el.append(_banda('Diárias'))
    diarias = []
    for bf in trip.beneficiaries.all():
        total = (bf.daily_quantity or Decimal('0')) * (bf.daily_rate or Decimal('0'))
        diarias.append([bf.city or '—', f'{_fmt(bf.start_date)} a {_fmt(bf.end_date)}',
                        str(bf.daily_quantity or '0'), _money(bf.daily_rate), _money(total)])
    if not diarias:
        diarias = [['—', '—', '0', _money(0), _money(0)]]
    el.append(_grade(
        ['Cidade', 'Período', 'Qtd. Diárias', 'Valor Diária', 'Total Diária'],
        diarias, [40 * mm, 55 * mm, 25 * mm, 30 * mm, 30 * mm],
        aligns={2: 'CENTER', 3: 'RIGHT', 4: 'RIGHT'},
    ))
    el.append(Spacer(1, 5))

    # Comprovação de Despesa
    el.append(_banda('Comprovação de Despesa'))
    itens = [[it.get_item_type_display(), it.description, _money(it.proven_value), _money(it.approved_value)]
             for it in report.expense_items.all()]
    if not itens:
        itens = [['—', 'Nenhuma despesa informada', _money(0), _money(0)]]
    el.append(_grade(
        ['Tipo', 'Descrição', 'Comprovado (R$)', 'Aprovado (R$)'],
        itens, [35 * mm, 85 * mm, 30 * mm, 30 * mm],
        aligns={2: 'RIGHT', 3: 'RIGHT'},
    ))
    el.append(Spacer(1, 5))

    # Resumo financeiro
    el.append(_banda('Resumo Financeiro'))
    el.append(_kv([
        ('Total de Diárias', _money(report.total_diarias)),
        ('Total das Despesas Aprovadas', _money(report.total_despesas_aprovadas)),
        ('Valor Total da Viagem', _money(report.valor_total_viagem)),
        ('Adiantamento Realizado', _money(report.advance_received)),
        ('Valor a Devolver à Embrapa', _money(report.valor_a_devolver)),
        ('Valor a Receber da Embrapa', _money(report.valor_a_receber)),
    ]))
    el.append(Spacer(1, 5))

    # Histórico de Encaminhamento
    rts = list(report.routings.all())
    if rts:
        el.append(_banda('Histórico de Encaminhamento'))
        linhas = [[r.action, (r.responsible.full_name if r.responsible else '—'),
                   r.created_at.strftime('%d/%m/%Y %H:%M'), r.note or '—'] for r in rts]
        el.append(_grade(
            ['Natureza', 'Responsável', 'Data', 'Justificativa'],
            linhas, [50 * mm, 40 * mm, 28 * mm, 62 * mm],
        ))
        el.append(Spacer(1, 8))

    # Assinaturas
    ass = Table([
        [_p('ATESTADO POR (SOF):', bold=True), _p('AUTORIZADO POR (Ordenador):', bold=True)],
        [_p((report.reviewed_by.full_name if report.reviewed_by else '')),
         _p('Francisco Ferraz Laranjeira Barbosa')],
        [_p('Data / Assinatura'), _p('Data / Assinatura')],
    ], colWidths=[90 * mm, 90 * mm], rowHeights=[8 * mm, 12 * mm, 8 * mm])
    ass.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.4, BORDA),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    el.append(ass)

    doc.build(el)
    return buf.getvalue()
