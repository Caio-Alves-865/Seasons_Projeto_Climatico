A Seasons é um site planejado e desenvolvido por Caio Alves de Vasconcelos, cumprindo a exigência acadêmica da unidade curricular de Desenvolvimento WEB Front-End 02 do curso de Análise e Desenvolvimento de Sistemas do IFSP, campus Bragança Paulista. 

Ele basicamente consome a API pública da Open-Meteo, a qual tem informações acerca do clima de praticamente todas as cidades do mundo, com registros que datam desde 01/01/1940 em diante. Além disso o site usa 3 endpoints da mesma API para pegar informações da cidade buscada pelo usuário e a busca dos informações climáticas daquele lugar atual e futuramente, além dos registros históricos. Esses endpoints são: Geocoding, Forecast API e Archive API. 

Por fim, o site usa essas informações obtidas e insere na tela para o usuário, além de um mapa mostrando a cidade pesquisada. Esse mapa é construído a partir das informações vindas da Geocoding. A ferramenta externa da Esri/ArcGIS pega isso e fornece mapa sobre ruas, terrenos, etc. 
A biblioteca do JavaScript - Leaflet - pega essas imagens do local e monta o mapa, sendo necessário por fim a utilização da biblioteca do React "React-Leaflet" para inserir o mapa na tela. 


O site consegue mostrar a situação do tempo atualmente, prever o tempo para até 5 dias consecutivos e visualizar o histórico climático por meio de cards e gráficos interativos até 1940 (data do início dos registros pela API).

Para executar o código na máquina basta baixar o pacote "node_modules" no terminal do VSCode usando o React e Node, via comando "npm install". Após instalação do pacote basta mandar "npm run dev" e executar o programa. 