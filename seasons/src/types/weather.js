/**
 * Estruturas de dados recebidas das APIs e compartilhadas entre componentes.
 * JSDoc mantém a documentação e o autocompletar do editor sem adicionar
 * dependências nem verificações de tipos em tempo de execução.
 * @module weather-data
 */

/** @typedef {Object} GeoLocation
 * @property {number} id Identificador da localidade na API de geocodificação.
 * @property {string} name Nome da cidade/localidade.
 * @property {number} latitude Latitude usada nas consultas meteorológicas e no mapa.
 * @property {number} longitude Longitude usada nas consultas meteorológicas e no mapa.
 * @property {string} timezone Fuso horário IANA da localidade.
 * @property {string} country País da localidade.
 * @property {string} country_code Código do país.
 * @property {string} [feature_code] Código GeoNames do tipo de localidade.
 * @property {number} [admin1_id] Identificador da região administrativa principal.
 * @property {number} [admin2_id] Identificador da região administrativa secundária.
 * @property {string} [admin1] Estado ou região administrativa principal.
 * @property {string} [admin2] Região administrativa secundária.
 * @property {number|null} [population] População, quando fornecida pela API.
 */

/** @typedef {Object} CurrentWeather
 * @property {string} time Horário da leitura atual.
 * @property {number} interval Intervalo da medição, em segundos.
 * @property {number|null} temperature_2m Temperatura do ar a dois metros, em °C.
 * @property {number|null} relative_humidity_2m Umidade relativa, em %.
 * @property {number|null} apparent_temperature Sensação térmica, em °C.
 * @property {number} is_day Indicador de dia (1) ou noite (0).
 * @property {number|null} precipitation Precipitação no intervalo, em mm.
 * @property {number|null} rain Chuva, em mm.
 * @property {number|null} showers Aguaceiros, em mm.
 * @property {number|null} snowfall Neve, em cm.
 * @property {number} weather_code Código meteorológico WMO.
 * @property {number|null} cloud_cover Cobertura de nuvens, em %.
 * @property {number|null} uv_index Índice ultravioleta.
 * @property {number|null} wind_speed_10m Velocidade do vento, em km/h.
 * @property {number|null} wind_gusts_10m Rajadas de vento, em km/h.
 */

/** @typedef {Object} DailyWeather
 * @property {string[]} time Datas no formato ISO.
 * @property {number[]} weather_code Códigos meteorológicos WMO.
 * @property {(number|null)[]} temperature_2m_max Temperaturas máximas diárias.
 * @property {(number|null)[]} temperature_2m_min Temperaturas mínimas diárias.
 * @property {(number|null)[]} apparent_temperature_max Sensações térmicas máximas.
 * @property {(number|null)[]} apparent_temperature_min Sensações térmicas mínimas.
 * @property {(number|null)[]} precipitation_sum Precipitação acumulada por dia.
 * @property {(number|null)[]} precipitation_probability_max Probabilidade máxima diária de precipitação.
 * @property {(number|null)[]} wind_speed_10m_max Velocidade máxima diária do vento.
 * @property {(number|null)[]} wind_gusts_10m_max Rajada máxima diária.
 * @property {(number|null)[]} uv_index_max Índice UV máximo diário.
 */

/** @typedef {Object} ForecastResponse
 * @property {number} latitude Latitude retornada pela API.
 * @property {number} longitude Longitude retornada pela API.
 * @property {string} timezone Fuso horário usado nos dados.
 * @property {string} timezone_abbreviation Abreviação do fuso.
 * @property {CurrentWeather} current Condições atuais.
 * @property {Record<string,string>} current_units Unidades das condições atuais.
 * @property {{time:string[],relative_humidity_2m:(number|null)[],precipitation_probability:(number|null)[]}} hourly Séries horárias.
 * @property {DailyWeather} daily Séries diárias.
 * @property {Record<string,string>} daily_units Unidades das séries diárias.
 */

/** @typedef {Object} ArchiveResponse
 * @property {string} timezone Fuso horário dos timestamps.
 * @property {{time:number[],temperature_2m:(number|null)[],relative_humidity_2m:(number|null)[],precipitation:(number|null)[]}} hourly Séries históricas horárias.
 * @property {Record<string,string>} hourly_units Unidades das séries históricas.
 */

/** @typedef {Object} HistoryDay
 * @property {string} date Data civil local no formato ISO.
 * @property {number|null} temperatureMean Temperatura média do dia.
 * @property {number|null} temperatureMin Temperatura mínima do dia.
 * @property {number|null} temperatureMax Temperatura máxima do dia.
 * @property {number|null} humidityMean Umidade média do dia.
 * @property {number|null} humidityMin Umidade mínima do dia.
 * @property {number|null} humidityMax Umidade máxima do dia.
 * @property {number|null} precipitation Precipitação acumulada no dia.
 */

export {};
