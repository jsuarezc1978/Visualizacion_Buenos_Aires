document.addEventListener("DOMContentLoaded", function () {
const geojson_url = "https://raw.githubusercontent.com/juan-gutierrez/buenos-aires-geojson/main/barrios/barrios.geojson";

    const url = "https://raw.githubusercontent.com/jsuarezc1978/HerramientasVisualizacion/main/listings_Buenos_Aires_limpio.csv";

    d3.dsv(";", url).then(data => {
// Limpieza mínima
  data.forEach(d => {
    d.room_type = d.room_type ? d.room_type.trim() : "Desconocido";
    d.price = +d.price.replace(/[^0-9.-]+/g, "");
    d.latitude = +d.latitude;
    d.longitude = +d.longitude;
  });

  // Inicializar combo de filtro
  const combo = d3.select("#filterRoomType");

  // Llenar opciones únicas
  const tiposUnicos = Array.from(new Set(data.map(d => d.room_type))).sort();
  tiposUnicos.forEach(t => {
    combo.append("option").attr("value", t).text(t);
  });

  combo.on("change", () => {
    const selected = combo.node().value;
    const dataFiltrada = selected === "Todos" ? data : data.filter(d => d.room_type === selected);
    actualizarGraficos(dataFiltrada);
  });

  // Función de inicialización
  actualizarGraficos(data);


function actualizarGraficos(data) {

      // Limpieza mínima
     //  data.forEach(d => {
      //   d.room_type = d.room_type ? d.room_type.trim() : "Desconocido";
      //   d.price = +d.price.replace(/[^0-9.-]+/g, "");
      //   d.latitude = +d.latitude;
      //   d.longitude = +d.longitude;
      // });


      const tooltip = d3.select("#tooltip");
      const margin = { top: 30, right: 40, bottom: 60, left: 60 };

      // ================================
      // 📊 Gráfico de barras: room_type
      // ================================
      const barSvgNode = document.getElementById("barChart");
      if (!barSvgNode) return;
      const barSvg = d3.select(barSvgNode);
      barSvg.selectAll("*").remove();;
      d3.select("#barChart"),
            barWidth = +barSvg.attr("width"),
            barHeight = +barSvg.attr("height");

      const grouped = d3.rollups(data, v => v.length, d => d.room_type);
      const x = d3.scaleBand()
                  .domain(grouped.map(d => d[0]))
                  .range([margin.left, barWidth - margin.right])
                  .padding(0.3);

      const y = d3.scaleLinear()
                  .domain([0, d3.max(grouped, d => d[1])])
                  .nice()
                  .range([barHeight - margin.bottom, margin.top]);

      barSvg.append("g")
            .attr("transform", `translate(0,${barHeight - margin.bottom})`)
            .call(d3.axisBottom(x));

      barSvg.append("text")
            .attr("x", barWidth / 2)
            .attr("y", barHeight - 10)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text("Tipo de Alojamiento");

      barSvg.selectAll("rect")
            .data(grouped)
            .enter()
            .append("rect")
            .attr("x", d => x(d[0]))
            .attr("y", d => y(d[1]))
            .attr("width", x.bandwidth())
            .attr("height", d => barHeight - margin.bottom - y(d[1]))
            .attr("fill", "steelblue")
            .on("mouseover", (event, d) => {
              tooltip.style("opacity", 1)
                     .html(`<strong>${d[0]}</strong><br/>${d[1]} alojamientos`)
                     .style("left", (event.pageX + 10) + "px")
                     .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

      barSvg.selectAll("text.bar-label")
            .data(grouped)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d[0]) + x.bandwidth() / 2)
            .attr("y", d => y(d[1]) - 5)
            .attr("text-anchor", "middle")
            .attr("fill", "#333")
            .text(d => d[1]);

      // ================================
      // 📊 Histograma de precios
      // ================================
      const histogramSvgNode = document.getElementById("priceHistogram");
      if (!histogramSvgNode) return;
      const histogramSvg = d3.select(histogramSvgNode);
      histogramSvg.selectAll("*").remove();
      d3.select("#priceHistogram"),
            histWidth = +histogramSvg.attr("width"),
            histHeight = +histogramSvg.attr("height");

      const prices = data.map(d => d.price).filter(p => !isNaN(p));

      const xHist = d3.scaleLinear()
        .domain([0, d3.max(prices)])
        .range([margin.left, histWidth - margin.right]);

      const bins = d3.bin().domain(xHist.domain()).thresholds(20)(prices);

      const yHist = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([histHeight - margin.bottom, margin.top]);

      histogramSvg.append("g")
        .attr("transform", `translate(0,${histHeight - margin.bottom})`)
        .call(d3.axisBottom(xHist));

      histogramSvg.append("text")
        .attr("x", histWidth / 2)
        .attr("y", histHeight - 10)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Precio por Noche (ARS$)");

      histogramSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yHist));

      histogramSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -histHeight / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Cantidad de Alojamientos");

      histogramSvg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => xHist(d.x0) + 1)
        .attr("y", d => yHist(d.length))
        .attr("width", d => xHist(d.x1) - xHist(d.x0) - 1)
        .attr("height", d => histHeight - margin.bottom - yHist(d.length))
        .attr("fill", "darkorange");

      // ================================
      // 📈 Scatter plot: Días vs Reseñas
      // ================================
      const scatterSvgNode = document.getElementById("scatterChart");
      if (!scatterSvgNode) return;
      const scatterSvg = d3.select(scatterSvgNode);
      scatterSvg.selectAll("*").remove();
      d3.select("#scatterChart"),
            scatterWidth = +scatterSvg.attr("width"),
            scatterHeight = +scatterSvg.attr("height");

      const filteredScatter = data.filter(d => {
        const avail = +d.availability_365;
        const reviews = +d.number_of_reviews;
        return !isNaN(avail) && !isNaN(reviews) && reviews < 500;
      });

      const xScatter = d3.scaleLinear()
        .domain([0, 365])
        .range([margin.left, scatterWidth - margin.right]);

      const yScatter = d3.scaleLinear()
        .domain([0, d3.max(filteredScatter, d => +d.number_of_reviews)])
        .range([scatterHeight - margin.bottom, margin.top]);

      scatterSvg.append("g")
        .attr("transform", `translate(0,${scatterHeight - margin.bottom})`)
        .call(d3.axisBottom(xScatter));

      scatterSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScatter));

      scatterSvg.selectAll("circle")
        .data(filteredScatter)
        .enter()
        .append("circle")
        .attr("cx", d => xScatter(+d.availability_365))
        .attr("cy", d => yScatter(+d.number_of_reviews))
        .attr("r", 3)
        .attr("fill", "purple")
        .attr("opacity", 0.5);

      scatterSvg.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight - 10)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Días Disponibles al Año");

      scatterSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Número de Reseñas");
    
      // ================================
      // 📈 Gráfico de líneas por tipo de habitación
      // ================================

      // Limpieza y parsing
      data.forEach(d => {
        if (d.last_review && d.last_review.includes("-")) {
          d.review_month = d.last_review.split("-")[1];
        } else {
          d.review_month = null;
        }
        d.room_type = d.room_type ? d.room_type.trim() : "Desconocido";
      });

      // Obtener meses y tipos únicos
      const meses = ["01","02","03","04","05","06","07","08","09","10","11","12"];
      const tipos = Array.from(new Set(data.map(d => d.room_type)));

      // Crear estructura agrupada por tipo de habitación
      const series = tipos.map(tipo => {
        return {
          tipo: tipo,
          valores: meses.map(mes => {
            const total = data.filter(d => d.review_month === mes && d.room_type === tipo).length;
            return { mes: mes, cantidad: total };
          })
        };
      });

      // Escalas
      const svg4Node = document.getElementById("monthlyChart");
      if (!svg4Node) return;
      const svg4 = d3.select(svg4Node);
      svg4.selectAll("*").remove();
      d3.select("#monthlyChart"),
            width4 = +svg4.attr("width"),
            height4 = +svg4.attr("height");

      const x4 = d3.scalePoint()
        .domain(meses)
        .range([margin.left, width4 - margin.right]);

      const y4 = d3.scaleLinear()
        .domain([0, d3.max(series, s => d3.max(s.valores, v => v.cantidad))])
        .nice()
        .range([height4 - margin.bottom, margin.top]);

      const color = d3.scaleOrdinal()
        .domain(tipos)
        .range(d3.schemeSet2);

      // Ejes
      svg4.append("g")
        .attr("transform", `translate(0,${height4 - margin.bottom})`)
        .call(d3.axisBottom(x4));

      svg4.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y4));

      // Líneas
      const linea = d3.line()
        .x(d => x4(d.mes))
        .y(d => y4(d.cantidad));

      svg4.selectAll(".linea")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "linea")
        .attr("fill", "none")
        .attr("stroke", d => color(d.tipo))
        .attr("stroke-width", 2)
        .attr("d", d => linea(d.valores));

      // Leyenda
      const legend = svg4.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width4 - 140},${margin.top})`);

      series.forEach((s, i) => {
        const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);

        g.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(s.tipo));

        g.append("text")
          .attr("x", 16)
          .attr("y", 10)
          .text(s.tipo)
          .attr("font-size", "12px")
          .attr("fill", "#333");
      });


      // Ejes secundarios
      svg4.append("text")
        .attr("x", width4 / 2)
        .attr("y", height4 - 10)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Mes");

      svg4.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height4 / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Cantidad de Reseñas");

      // ================================
      // 🗺️ Mapa con proyección centrada y contorno visible
      // ================================

      const svgGeoNode = document.getElementById("mapChartGeo");
      if (!svgGeoNode) return;
      const svgGeo = d3.select(svgGeoNode);
      svgGeo.selectAll("*").remove();
      d3.select("#mapChartGeo"),
            widthGeo = +svgGeo.attr("width"),
            heightGeo = +svgGeo.attr("height");

      const projectionGeo = d3.geoMercator()
                              .center([-58.42, -34.61]) // Centro de BA
                              .scale(140000)             // Zoom adecuado
                              .translate([widthGeo / 2, heightGeo / 2]);

      const pathGeo = d3.geoPath().projection(projectionGeo);

          // Nuevo GeoJSON más detallado
          d3.json("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/buenos-aires.geojson")
        .then(geojson => {
          // Fondo: barrios
          svgGeo.append("g")
                .selectAll("path")
                .data(geojson.features)
                .enter()
                .append("path")
                .attr("d", pathGeo)
                .attr("fill", "#f0f0f0")
                .attr("stroke", "#999");

          // Puntos: alojamientos con tooltip
          svgGeo.append("g")
                .selectAll("circle")
                .data(data.filter(d => +d.latitude && +d.longitude && +d.number_of_reviews))
                .enter()
                .append("circle")
                .attr("cx", d => projectionGeo([+d.longitude, +d.latitude])[0])
                .attr("cy", d => projectionGeo([+d.longitude, +d.latitude])[1])
                .attr("r", d => Math.sqrt(+d.number_of_reviews) / 2)
                .attr("fill", "crimson")
                .attr("opacity", 0.3)
                .on("mouseover", function (event, d) {
                  d3.select("#tooltipMap")
                    .style("opacity", 1)
                    .html(`
                      <strong>${d.name || "Alojamiento"}</strong><br/>
                      Reseñas: ${d.number_of_reviews}<br/>
                      Tipo: ${d.room_type || "N/A"}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                  d3.select("#tooltipMap")
                    .style("opacity", 0);
                });

          // Leyenda escala de reseñas
            const legend = svgGeo.append("g")
              .attr("transform", `translate(${widthGeo - 130},${heightGeo - 150})`);

            const reseñas = [1, 10, 50, 100, 300];

            reseñas.forEach((r, i) => {
              legend.append("circle")
                .attr("cx", 0)
                .attr("cy", i * 25)
                .attr("r", Math.sqrt(r) / 2)
                .attr("fill", "crimson")
                .attr("opacity", 0.4);

              legend.append("text")
                .attr("x", 15)
                .attr("y", i * 25 + 4)
                .text(`${r} reseñas`)
                .attr("font-size", "12px")
                .attr("fill", "#333");
            });

            legend.append("text")
              .attr("x", 0)
              .attr("y", -10)
              .text("Escala de Reseñas")
              .attr("font-weight", "bold")
              .attr("font-size", "12px");


        });



    }
  });
});
