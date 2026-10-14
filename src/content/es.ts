/**
 * Every user-facing string in the application.
 *
 * The codebase is written in English; the interface is Spanish. Keeping the
 * copy in one typed module rather than inline in components is what makes that
 * separation hold, and it is the seam a real i18n library would slot into later
 * without touching a single component.
 */

export const content = {
  app: {
    name: "Finanzas en casa",
    shortName: "Finanzas",
    description: "Gastos, ingresos y plan mensual de la casa.",
  },

  common: {
    save: "Guardar",
    saving: "Guardando…",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Agregar",
    close: "Cerrar",
    optional: "Opcional",
    planned: "Planeado",
    actual: "Real",
    difference: "Diferencia",
    total: "Total",
    yes: "Sí",
    no: "No",
    details: "Ver detalle",
    loading: "Cargando…",
    genericError: "Algo salió mal. Intenta de nuevo.",
  },

  nav: {
    label: "Navegación principal",
    dashboard: "Resumen",
    expenses: "Gastos",
    income: "Ingresos",
    budget: "Plan",
    settings: "Ajustes",
    signOut: "Cerrar sesión",
  },

  theme: {
    label: "Tema",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
  },

  month: {
    previous: "Mes anterior",
    next: "Mes siguiente",
    current: "Ir al mes actual",
    isCurrent: "Mes actual",
    past: "Mes pasado",
    future: "Mes futuro",
  },

  auth: {
    title: "Finanzas en casa",
    subtitle: "Ingresa para ver las cuentas de la casa.",
    email: "Correo",
    emailPlaceholder: "tu@correo.com",
    password: "Contraseña",
    submit: "Entrar",
    submitting: "Entrando…",
    failed: "No pudimos iniciar sesión. Revisa tu correo y contraseña.",
    privateNotice: "Esta aplicación es privada y solo para los miembros de la casa.",
    devLogin: "Entrar con la cuenta de prueba",
    devLoginHint: "Solo en desarrollo",
  },

  dashboard: {
    title: "Resumen",
    income: "Ingresos",
    expenses: "Gastos",
    remaining: "Disponible",
    planVsActual: "Plan vs. real",
    planEmpty: "Este mes no tiene plan ni gastos todavía.",
    contributions: "Gastos de cada uno",
    contributionsEmpty: "Nadie ha registrado gastos este mes.",
    creditCards: "Tarjetas de crédito",
    creditCardsEmpty: "No hay tarjetas de crédito registradas.",
    trend: "Ingresos y gastos por mes",
    trendEmpty: "Aún no hay suficientes datos para ver la tendencia.",
    month: "Mes",
    breakdown: "Hogar vs. personal",
    householdSpend: "Del hogar",
    personalSpend: "Personales",
    breakdownEmpty: "Aún no hay gastos que repartir este mes.",
    recent: "Gastos recientes",
    recentEmpty: "Aún no hay gastos este mes.",
    subtitle: "Así van nuestras finanzas este mes.",
    allGood: "Todo al día",
    closeToPlan: "Cerca del plan",
    seeAll: "Ver todas",
    monthlyComparison: "Resumen mensual",
    planned: "Planificado",
    actual: "Real",
    byCategory: "Gastos por categoría",
    byCategoryEmpty: "Aún no hay gastos que repartir por categoría.",
    otherCategories: "Otros",
    totalSpent: "Total gastos",
    householdCard: "Gastos del hogar",
    byPerson: "Resumen de cada uno",
    byPersonHint: "Qué entró, qué le tocó gastar y qué le queda.",
    personSpent: "Sus gastos",
    personShared: "Su parte del hogar",
    personPersonal: "Personales",
    personAvailable: "Le queda",
    personIncomeEmpty: "Sin ingresos registrados este mes.",
    ofIncomeSpent: "del ingreso",
    vsPlan: "vs. plan",
    upcomingPayments: "Próximos pagos de tarjetas",
    upcomingPaymentsEmpty: "No hay pagos de tarjeta pendientes.",

    incomeSpent: "Gastos vs. ingresos",
    spent: "Gastado",
    budgetEmpty: "Sin plan",
    incomeSpentEmpty: "Sin ingresos",
    incomeSpentEmptyHint:
      "Este mes todavía no tiene ingresos registrados. Regístralos para ver qué parte ya se gastó.",
    goToIncome: "Registrar ingresos",
    overIncome: "Sobre el ingreso",
    withinIncome: "Dentro del ingreso",
    pace: "del mes transcurrido",
    paceMarker: "Hoy en el mes",
    onPace: "Vas al ritmo del mes.",
    aheadOfPace: "Vas gastando más rápido que el mes.",
    behindPace: "Vas gastando más lento que el mes.",
    overBudget: "Sobre el plan",
    underBudget: "Bajo el plan",
  },

  creditCard: {
    used: "Usado",
    available: "Disponible",
    limit: "Cupo",
    closes: "Cierra",
    dues: "Se paga",
    currentCycle: "Del ciclo actual",
    overLimit: "Sobre el cupo",
    overdue: "Vencido",
  },

  expenses: {
    title: "Gastos",
    tabExpenses: "Gastos",
    tabTransfers: "Traslados",
    new: "Nuevo gasto",
    edit: "Editar gasto",
    empty: "Aún no hay gastos este mes.",
    emptyHint: "Registra el primero para empezar a comparar con el plan.",
    description: "Descripción",
    descriptionPlaceholder: "Recibo del agua",
    amount: "Monto",
    date: "Fecha",
    category: "Categoría",
    paymentMethod: "Método de pago",
    paidBy: "Pagado por",
    shared: "Gasto compartido",
    sharedHint:
      "Cuenta como gasto de los dos, cada uno según su parte. Desactívalo si es solo de quien pagó.",
    payerShare: "Parte de quien pagó (%)",
    payerShareHint: "El resto le toca a la otra persona. 50 es mitad y mitad.",
    split: "Reparto",
    personal: "Personal",
    notes: "Notas",
    totalAmount: "Monto total",
    thisMonth: "Este mes",
    installments: "Cuotas",
    installmentsHint: "En cuántas cuotas quedó la compra. 1 si la pagaste de una.",
    coversMonths: "Cubre cuántos meses",
    coversMonthsHint: "Un recibo bimensual cubre 2 meses: el valor se reparte entre ellos.",
    annualRate: "%EA de la compra",
    annualRateHint: "Tasa efectiva anual. Si la dejas vacía, no se cobran intereses.",
    repeat: "Se repite",
    repeatHint: "Para lo que ya sabes que llega siempre: arriendo, suscripciones, servicios.",
    repeatNever: "No se repite",
    repeatMonthly: "Cada mes",
    repeatBimonthly: "Cada 2 meses",
    repeatQuarterly: "Cada 3 meses",
    repeatBiannual: "Cada 6 meses",
    repeatYearly: "Cada año",
    repeatUntil: "Hasta",
    repeatUntilHint: "Déjalo vacío si no tiene fecha de fin.",
    active: "Contar en los totales",
    excluded: "Excluido",
    excludedHint: "Los gastos excluidos se guardan pero no cuentan en ningún total.",
    enabled: "Gasto incluido de nuevo.",
    disabled: "Gasto excluido de los cálculos.",
    created: "Gasto registrado.",
    updated: "Gasto actualizado.",
    deleted: "Gasto eliminado.",
    confirmDelete: "¿Eliminar este gasto?",
  },

  transfers: {
    title: "Traslados",
    new: "Nuevo traslado",
    empty: "Aún no hay traslados este mes.",
    hint: "Un traslado mueve dinero entre cuentas — por ejemplo, pagar la tarjeta. Nunca cuenta como gasto.",
    from: "Desde",
    to: "Hacia",
    amount: "Monto",
    date: "Fecha",
    notes: "Notas",
    created: "Traslado registrado.",
    deleted: "Traslado eliminado.",
    confirmDelete: "¿Eliminar este traslado?",
  },

  income: {
    title: "Ingresos",
    new: "Nuevo ingreso",
    empty: "Aún no hay ingresos este mes.",
    emptyHint: "Registra lo que entró para compararlo con lo esperado.",
    label: "Concepto",
    labelPlaceholder: "Nómina de septiembre",
    amount: "Monto",
    date: "Fecha",
    receivedBy: "Recibido por",
    account: "Cuenta",
    noAccount: "Sin cuenta",
    notes: "Notas",
    expectedVsActual: "Esperado vs. recibido",
    created: "Ingreso registrado.",
    deleted: "Ingreso eliminado.",
    confirmDelete: "¿Eliminar este ingreso?",
    expectedTitle: "Esperados este mes",
    markReceived: "Marcar como recibido",
    receiving: "Registrando…",
    received: "Recibido",
    notYet: "Por llegar",
    receivedSaved: "Ingreso registrado.",
    alreadyReceived: "Este ingreso ya se registró este mes.",
    notExpected: "Este ingreso no se espera en ese mes.",
    futureMonth: "Ese mes todavía no llega.",
  },

  budget: {
    title: "Plan",
    templateTab: "Plantilla global",
    monthTab: "Ajustes del mes",
    templateHint:
      "La plantilla aplica desde este mes en adelante. Los gastos que se repiten se suman solos; aquí va lo demás.",
    monthHint:
      "Ajusta un mes puntual sin tocar la plantilla. Lo que no ajustes sigue la plantilla.",
    expenseSection: "Gastos planeados",
    incomeSection: "Ingresos esperados",
    perMonth: "Al mes",
    usesTemplate: "Sigue la plantilla",
    overridden: "Ajustado este mes",
    resetToTemplate: "Volver a la plantilla",
    templateSaved: "Plantilla actualizada.",
    monthSaved: "Plan del mes actualizado.",
    resetDone: "Este mes vuelve a seguir la plantilla.",
    incomeEmpty: "Agrega las fuentes de ingreso en Ajustes para planearlas aquí.",
  },

  settings: {
    title: "Ajustes",
    profile: "Tu perfil",
    displayName: "Nombre",
    profileSaved: "Perfil actualizado.",
    household: "La casa",
    householdName: "Nombre de la casa",
    householdSaved: "Casa actualizada.",
    paymentMethods: "Métodos de pago",
    paymentMethodsEmpty: "Aún no hay métodos de pago.",
    newPaymentMethod: "Nuevo método de pago",
    methodName: "Nombre",
    methodNamePlaceholder: "Cuenta de nómina",
    methodType: "Tipo",
    methodOwner: "Dueño",
    methodActive: "Activo",
    methodInactive: "Inactivo",
    creditLimit: "Cupo total",
    closingDay: "Día de cierre",
    dueDay: "Día de pago",
    defaultRate: "%EA por defecto",
    defaultRateHint: "Tasa efectiva anual que ofrece la tarjeta para compras a cuotas.",
    openingDebt: "Deuda inicial",
    openingDebtHint:
      "Lo que ya debías en la tarjeta antes de usar la app. No incluyas compras que ya registraste aquí.",
    dayHint: "Día del mes, de 1 a 31.",
    methodSaved: "Método de pago guardado.",
    methodDeleted: "Método de pago eliminado.",
    confirmDeleteMethod: "¿Eliminar este método de pago?",
    categories: "Categorías",
    categoriesEmpty: "Aún no hay categorías.",
    newCategory: "Nueva categoría",
    categoryName: "Nombre",
    categoryArchived: "Archivada",
    categorySaved: "Categoría guardada.",
    incomeSources: "Fuentes de ingreso",
    incomeSourcesEmpty: "Aún no hay fuentes de ingreso.",
    newIncomeSource: "Nueva fuente de ingreso",
    incomeSourceLabel: "Concepto",
    incomeSourceOwner: "De quién",
    incomeSourceAmount: "Esperado al mes",
    incomeSourceActive: "Activa",
    incomeSourceInactive: "Inactiva",
    incomeSourceSaved: "Fuente de ingreso guardada.",
    incomeSourceAmountHint: "Se espera desde este mes. Los meses anteriores no cambian.",
    incomeSourceAccount: "Cuenta donde llega",
    incomeSourceAccountHint:
      "Una cuenta, efectivo o tarjeta de beneficios. Nunca una tarjeta de crédito.",
  },

  paymentMethodType: {
    bank_account: "Cuenta bancaria",
    benefits_card: "Tarjeta de beneficios",
    credit_card: "Tarjeta de crédito",
    cash: "Efectivo",
  },

  errors: {
    title: "Algo salió mal",
    description: "No pudimos cargar esta información. Vuelve a intentarlo.",
    retry: "Reintentar",
    refreshTitle: "No se pudo actualizar la página",
    refreshDescription: "Lo que hayas guardado ya quedó guardado. Vuelve a intentarlo.",
    notFoundTitle: "No encontramos esta página",
    notFoundDescription: "El enlace no existe o ya no está disponible.",
    backToDashboard: "Ir al resumen",
  },

  validation: {
    required: "Este campo es obligatorio.",
    formInvalid: "No se guardó. Revisa los campos marcados en rojo.",
    notAllowed: "No tienes permiso para hacer esto.",
    amountInvalid: "Ingresa un monto válido.",
    amountPositive: "El monto debe ser mayor que cero.",
    amountNotNegative: "El monto no puede ser negativo.",
    amountTooLarge: "El monto es demasiado grande.",
    dateInvalid: "Ingresa una fecha válida.",
    monthInvalid: "Selecciona un mes válido.",
    idInvalid: "Selecciona una opción válida.",
    emailInvalid: "Ingresa un correo válido.",
    passwordRequired: "Ingresa tu contraseña.",
    textTooLong: "El texto es demasiado largo.",
    dayRange: "Debe ser un día entre 1 y 31.",
    installmentsRange: "Debe ser un número de cuotas entre 1 y 120.",
    repeatRange: "Debe repetirse cada 1 a 60 meses.",
    rateRange: "Ingresa un %EA entre 0 y 200.",
    rateNeedsInstallments: "El %EA solo aplica si hay más de una cuota.",
    repeatUntilNeedsRepeat: "Indica cada cuántos meses se repite.",
    splitRange: "Ingresa un porcentaje entero entre 0 y 100.",
    incomeAccountNotCard: "Un ingreso no puede llegar a una tarjeta de crédito.",
    creditCardFieldsRequired:
      "Las tarjetas de crédito necesitan cupo, día de cierre y día de pago.",
    sameAccount: "Elige dos cuentas distintas.",
  },

  a11y: {
    monthNavigation: "Cambiar de mes",
    openMenu: "Abrir menú",
    amountFor: "Monto",
    deleteExpense: "Eliminar gasto",
    toggleExpense: "Contar este gasto en los totales",
    deleteTransfer: "Eliminar traslado",
    deleteIncome: "Eliminar ingreso",
  },
} as const;

/** `80% de los gastos del mes` — the household's part of the month's spending. */
export function householdShareLabel(percentage: number): string {
  return `${percentage}% de los gastos del mes`;
}

/** `Julián 60% · GF 40%` — how a shared expense divides. */
export function splitSummary(parts: readonly { name: string; percent: number }[]): string {
  return parts.map((part) => `${part.name} ${part.percent}%`).join(" · ");
}

/** `Se suma a $ 65.000 de gastos que se repiten.` — the part of a category that plans itself. */
export function recurringNote(amount: string): string {
  return `Se suma a ${amount} de gastos que se repiten.`;
}

/** `Cada 2 meses` — how often a bill comes back. */
export function repeatEvery(months: number): string {
  return months === 1 ? content.expenses.repeatMonthly : `Cada ${months} meses`;
}

/** `28,5 %EA` */
export function ratePercent(rate: number): string {
  return `${rate.toLocaleString("es-CO")} %EA`;
}

/** `Cuota 3 de 12` */
export function installmentLabel(index: number, count: number): string {
  return `Cuota ${index} de ${count}`;
}

/** `Se reparte en 2 meses` — for a bill that covers more than one month. */
export function spreadLabel(count: number): string {
  return `Se reparte en ${count} meses`;
}

/** `Julián · Tarjeta de crédito 1` */
export function payerWithMethod(payer: string, method: string): string {
  return `${payer} · ${method}`;
}

/** `¡Hola, Julián!` */
export function greeting(name: string): string {
  return `¡Hola, ${name}!`;
}

/** `Plan: $ 3.500.000` */
export function planLabel(amount: string): string {
  return `Plan: ${amount}`;
}

/** `de $ 2.500.000 de ingresos` */
export function ofIncomeTotal(amount: string): string {
  return `de ${amount} de ingresos`;
}

/** `3 oct · cerró el 13 sep` — a card statement that has already closed. */
export function closedStatementDue(due: string, closing: string): string {
  return `${due} · cerró el ${closing}`;
}

/** `3 nov · cierra el 13 oct` — the cycle a card is building up now. */
export function openCycleDue(due: string, closing: string): string {
  return `${due} · cierra el ${closing}`;
}

/** `40% del mes transcurrido` */
export function elapsedLabel(percentage: number): string {
  return `${percentage}% del mes transcurrido`;
}

/** `3 de 9 categorías sobre el plan` */
export function overBudgetSummary(overCount: number, total: number): string {
  // The noun agrees with the total, not with the count before it: "1 de 6
  // categorías" is right, "1 de 6 categoría" is not.
  const noun = total === 1 ? "categoría" : "categorías";
  return `${overCount} de ${total} ${noun} sobre el plan`;
}
