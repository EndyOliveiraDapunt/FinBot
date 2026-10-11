/**
 * Utilitários de datas respeitando o fuso horário brasileiro (America/Sao_Paulo)
 */

export function getTodayDateString(timezone: string = 'America/Sao_Paulo'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function getNowInTimezone(timezone: string = 'America/Sao_Paulo'): Date {
  const now = new Date();
  const tzString = now.toLocaleString('en-US', { timeZone: timezone });
  return new Date(tzString);
}

export interface PeriodRange {
  startDate: string;
  endDate: string;
  label: string;
}

export function resolvePeriodDates(
  period: string = 'this_month',
  timezone: string = 'America/Sao_Paulo'
): PeriodRange {
  const todayStr = getTodayDateString(timezone);
  const [year, month, day] = todayStr.split('-').map(Number);
  const now = new Date(year, month - 1, day);

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  const p = period.toLowerCase();

  if (p === 'today' || p === 'hoje') {
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: 'de Hoje',
    };
  }

  if (p === 'yesterday' || p === 'ontem') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatIso(yest);
    return {
      startDate: yestStr,
      endDate: yestStr,
      label: 'de Ontem',
    };
  }

  if (p === 'this_week' || p === 'current_week' || p === 'semana' || p === 'esta_semana') {
    const startOfWeek = new Date(now);
    // Domingo como início
    startOfWeek.setDate(now.getDate() - now.getDay());
    return {
      startDate: formatIso(startOfWeek),
      endDate: todayStr,
      label: 'desta Semana',
    };
  }

  if (p === 'last_week' || p === 'semana_passada') {
    const endOfLastWeek = new Date(now);
    endOfLastWeek.setDate(now.getDate() - now.getDay() - 1);
    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
    return {
      startDate: formatIso(startOfLastWeek),
      endDate: formatIso(endOfLastWeek),
      label: 'da Semana Passada',
    };
  }

  if (p === 'last_month' || p === 'mes_passado') {
    const startOfLastMonth = new Date(year, month - 2, 1);
    const endOfLastMonth = new Date(year, month - 1, 0);
    return {
      startDate: formatIso(startOfLastMonth),
      endDate: formatIso(endOfLastMonth),
      label: 'do Mês Passado',
    };
  }

  // Padrão: este mês
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  return {
    startDate: formatIso(startOfMonth),
    endDate: formatIso(endOfMonth),
    label: 'deste Mês',
  };
}

export function formatDateBR(dateIso: string): string {
  if (!dateIso) return '';
  const [year, month, day] = dateIso.split('-');
  return `${day}/${month}/${year}`;
}
