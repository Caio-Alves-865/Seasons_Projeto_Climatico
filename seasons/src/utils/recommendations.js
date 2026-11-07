/**
 * Aplica regras determinísticas aos dados meteorológicos para produzir dicas gerais.
 * As mensagens são recomendações educativas e não substituem alertas oficiais.
 * @param {Object} context Valores climáticos usados pelas regras.
 * @returns {Object} Textos de vestuário, hidratação e segurança.
 */
export function getWeatherRecommendations(context) {
    const apparent = context.feelsLike ?? context.temperature;
    const polar = Math.abs(context.latitude) >= 66;
    const dailySummary = context.timeScale === 'daily';
    const intenseCold = apparent !== null && apparent <= -15;
    const cold = apparent !== null && apparent <= 2;
    const hot = apparent !== null && apparent >= 30;
    const highHeat = apparent !== null && apparent >= 35;
    const thunderstorms = context.weatherCode >= 95;
    const highWind = context.wind !== null && context.wind >= 45;
    const snow = (context.weatherCode >= 71 && context.weatherCode <= 77)
        || context.weatherCode === 85
        || context.weatherCode === 86;
    const freezingRain = context.weatherCode === 66 || context.weatherCode === 67;
    const lowVisibility = context.weatherCode === 45 || context.weatherCode === 48;
    const amountThreshold = dailySummary ? 5 : 0.5;
    const heavyRainThreshold = dailySummary ? 20 : 7;
    const rain = (context.precipitation !== null && context.precipitation >= amountThreshold)
        || (context.weatherCode >= 51 && context.weatherCode <= 67)
        || (context.weatherCode >= 80 && context.weatherCode <= 82);
    const heavyRain = context.precipitation !== null && context.precipitation >= heavyRainThreshold;
    const strongSun = context.uvIndex !== null && context.uvIndex !== undefined && context.uvIndex >= 6;
    const highHumidity = context.humidity !== null && context.humidity >= 80 && apparent !== null && apparent >= 24;
    const missingFields = [
        context.temperature === null ? 'temperatura' : null,
        context.feelsLike === null ? 'sensação térmica' : null,
        context.humidity === null ? 'umidade' : null,
        context.precipitation === null ? 'precipitação' : null,
        context.wind === null ? 'vento' : null,
        context.uvIndex === null || context.uvIndex === undefined ? 'índice UV' : null,
    ].filter((field) => field !== null);
    let clothing;
    if (intenseCold && polar) {
        clothing = 'Frio intenso em latitude polar: use camadas térmicas e corta-vento, proteja mãos e rosto e siga o protocolo local para exposição ao frio.';
    }
    else if (intenseCold) {
        clothing = 'Frio intenso: prefira camadas térmicas, cubra a pele exposta e limite o tempo ao ar livre, especialmente com vento.';
    }
    else if (cold) {
        clothing = 'Vista camadas quentes e proteja mãos e extremidades; com chuva ou neve, prefira uma camada externa impermeável.';
    }
    else if (snow || freezingRain) {
        clothing = 'Há indicação de neve ou chuva congelante. Use calçado com aderência e roupa impermeável adequada às condições locais.';
    }
    else if (hot) {
        clothing = 'Prefira roupas leves e respiráveis; se o índice UV estiver elevado, cubra a pele e use proteção solar.';
    }
    else if (apparent === null) {
        clothing = 'Temperatura e sensação térmica não estão disponíveis. Confira a leitura e as condições locais antes de decidir o que vestir.';
    }
    else {
        clothing = 'As condições térmicas estão moderadas; vista-se conforme sua sensação e leve uma camada extra se for permanecer fora por mais tempo.';
    }
    let hydration;
    if (highHeat || (hot && highHumidity)) {
        hydration = 'Calor elevado; beba água regularmente, procure um local fresco e evite esforço sob sol forte.';
    }
    else if (hot) {
        hydration = 'Com esta temperatura, mantenha água acessível e faça pausas em ambiente fresco, sobretudo durante o período mais quente.';
    }
    else if (cold && polar) {
        hydration = 'No frio polar, a sede pode ser menos perceptível. Mantenha água disponível em recipiente protegido do congelamento e siga as orientações da equipe local.';
    }
    else if (cold) {
        hydration = 'Mesmo no frio, mantenha água acessível; a sensação de sede pode diminuir em baixas temperaturas.';
    }
    else if (context.humidity !== null && context.humidity < 25) {
        hydration = 'A umidade está baixa. Mantenha água por perto e considere o ar seco ao planejar períodos prolongados ao ar livre.';
    }
    else if (context.humidity === null) {
        hydration = 'A umidade não está disponível nesta consulta. Mantenha água acessível e ajuste sua rotina às condições locais.';
    }
    else {
        hydration = 'Mantenha água acessível ao longo do dia e ajuste a ingestão à temperatura e às suas necessidades.';
    }
    let safetyHeading = 'Condições locais';
    let safety;
    if (thunderstorms) {
        safetyHeading = 'Alerta de tempestade';
        safety = 'O modelo indica trovoadas. Procure abrigo seguro, evite áreas abertas e acompanhe os alertas oficiais da região.';
    }
    else if (polar && intenseCold) {
        safetyHeading = 'Segurança em área polar';
        safety = 'Confirme condições e procedimentos com a equipe local antes de qualquer deslocamento. Este resumo não substitui protocolos da estação nem avisos oficiais.';
    }
    else if (highHeat) {
        safetyHeading = 'Atenção ao calor';
        safety = 'A sensação térmica está muito elevada. Procure sombra ou ambiente fresco, reduza a exposição nos horários mais quentes e acompanhe avisos locais.';
    }
    else if (highWind) {
        safetyHeading = 'Atenção ao vento';
        safety = 'Vento forte previsto. Evite áreas expostas e proximidade de árvores, estruturas soltas ou objetos que possam ser arrastados.';
    }
    else if (snow || freezingRain) {
        safetyHeading = 'Atenção a gelo e neve';
        safety = 'Neve ou gelo podem reduzir a aderência e a visibilidade. Verifique avisos locais e as condições de vias antes de se deslocar.';
    }
    else if (heavyRain) {
        safetyHeading = 'Atenção à chuva intensa';
        safety = 'A precipitação está elevada. Acompanhe avisos locais e evite áreas alagadas, margens de rios e vias cobertas por água.';
    }
    else if (rain) {
        safetyHeading = 'Atenção à chuva';
        safety = 'Há chuva prevista ou observada. Redobre o cuidado com piso molhado e acompanhe alertas locais se a precipitação aumentar.';
    }
    else if (lowVisibility) {
        safetyHeading = 'Atenção à visibilidade';
        safety = 'O modelo indica neblina. Reduza a velocidade e confirme as condições de visibilidade antes de dirigir ou se deslocar.';
    }
    else if (strongSun) {
        safetyHeading = 'Atenção ao índice UV';
        safety = 'O índice UV está elevado. Prefira sombra nas horas de maior incidência e siga as recomendações locais de proteção solar.';
    }
    else if (polar) {
        safetyHeading = 'Condições polares';
        safety = 'Em latitude polar, confirme previsões e orientações com os serviços locais antes de deslocamentos. As condições podem mudar rapidamente.';
    }
    else if (context.wind === null || context.precipitation === null) {
        safetyHeading = 'Leitura parcial';
        safety = 'Não foi possível avaliar todas as condições de vento e precipitação nesta consulta. Verifique avisos oficiais locais antes de viajar ou planejar atividades.';
    }
    else {
        safety = 'Entre as variáveis disponíveis, os dados não indicam um alerta meteorológico específico agora. Verifique avisos oficiais antes de deslocamentos.';
    }
    const showAlert = thunderstorms
        || (polar && intenseCold)
        || highHeat
        || highWind
        || snow
        || freezingRain
        || heavyRain
        || rain
        || lowVisibility
        || strongSun;
    return {
        clothing,
        hydration,
        safety,
        safetyHeading,
        isPolar: polar,
        showAlert,
        dataNote: missingFields.length
            ? `Dados não disponíveis: ${missingFields.join(', ')}. A avaliação automática fica limitada às variáveis recebidas.`
            : null,
    };
}
