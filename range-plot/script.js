var graphic = d3.select('#graphic');
var pymChild = null;

function drawGraphic() {

  // clear out existing graphics
  graphic.selectAll("*").remove();


  //population accessible summmary
  d3.select('#accessibleSummary').html(config.essential.accessibleSummary)

  var threshold_md = config.optional.mediumBreakpoint;
  var threshold_sm = config.optional.mobileBreakpoint;

  //set variables for chart dimensions dependent on width of #graphic
  if (parseInt(graphic.style("width")) < threshold_sm) {
    size = "sm"
  } else if (parseInt(graphic.style("width")) < threshold_md) {
    size = "md"
  } else {
    size = "lg"
  }

  var margin = config.optional.margin[size]
  var chart_width = parseInt(graphic.style("width")) - margin.left - margin.right;

  groups = d3.groups(graphic_data, (d) => d.group)

  if(config.essential.xDomain=="auto"){
    let min=1000000
    let max=0
    for(i=2;i<graphic_data.columns.length;i++){
      min=d3.min([min,d3.min(graphic_data,(d)=>+d[graphic_data.columns[i]])])
      max=d3.max([max,d3.max(graphic_data,(d)=>+d[graphic_data.columns[i]])])
    }
    xDomain=[min,max]
  } else {
    xDomain=config.essential.xDomain
  }


  //set up scales
  const x = d3.scaleLinear()
    .range([0, chart_width])
    .domain(xDomain);

  const colour = d3.scaleOrdinal()
    .range(config.essential.colour_palette)
    .domain(Object.keys(config.essential.legendLabels))

  // create the y scale in groups
  groups.map(function(d) {
    //height
    d[2] = config.optional.seriesHeight[size] * d[1].length

    // y scale
    d[3] = d3.scalePoint()
      .padding(0.5)
      .range([0, d[2]])
      .domain(d[1].map(d => d.name));
    //y axis generator
    d[4]  = d3.axisLeft(d[3])
      .tickSize(0)
      .tickPadding(10);
  });

  //set up xAxis generator
  var xAxis = d3.axisBottom(x)
    .ticks(config.optional.xAxisTicks[size]);

  divs = graphic.selectAll('div.categoryLabels')
    .data(groups)
    .join('div')


  divs.append('p').attr('class','groupLabels').html((d) => d[0])

  svgs = divs.append('svg')
    .attr('class','chart')
    .attr('height', (d) => d[2] + margin.top + margin.bottom)
    .attr('width', chart_width + margin.left + margin.right)

  charts = svgs.append('g')
    .attr('transform','translate('+margin.left+','+margin.top+')')

  charts.each(function(d) {
    d3.select(this)
    .append('g')
    .attr('class','y axis')
    .call(d[4])
    .selectAll('text')
    .call(wrap,margin.left-10)

    d3.select(this)
    .append('g')
    .attr('transform',(d)=>'translate(0,'+d[2]+')')
    .attr('class','x axis')
    .each(function(){
      d3.select(this).call(xAxis.tickSize(-d[2]))
      .selectAll('line').each(function(e)
        {
          if (e == 0) {
            d3.select(this)
            .attr('stroke-width', '1.5px')
            .attr('stroke', '#b3b3b3')
          };
        })
    })

  })

  charts.selectAll('line.between')
    .data((d)=>d[1])
    .join('line')
    .attr('class','between')
    .attr('x1',(d)=>x(d.min))
    .attr('x2',(d)=>x(d.max))
    .attr('y1',(d,i)=>groups.filter(e=>e[0]==d.group)[0][3](d.name))
    .attr('y2',(d,i)=>groups.filter(e=>e[0]==d.group)[0][3](d.name))
    .attr('stroke','#c6c6c6')
    .attr('stroke-width','3px')

  graphic_data.columns.slice(-2).map((e)=>
    charts.selectAll('circle.'+e)
      .data((d)=>d[1])
      .join('circle')
      .attr('class',e)
      .attr('cx',(d)=>x(d[e]))
      .attr('cy',(d,i)=>groups.filter(f=>f[0]==d.group)[0][3](d.name))
      .attr('r',6)
      .attr('fill',colour(e))

  )

  graphic_data.columns.slice(-2).map((e)=>
    charts.selectAll('text.'+e)
      .data((d)=>d[1])
      .join('text')
      .attr('class','dataLabels')
      .attr('x',(d)=>x(d[e]))
      .attr('y',(d,i)=>groups.filter(f=>f[0]==d.group)[0][3](d.name))
      .text((d)=>d3.format(config.essential.numberFormat)(d[e]))
      .attr('fill',colour(e))
      .attr('dy',6)
      .attr('dx',()=> e=='min' ? -8 : 8)
      .attr('text-anchor',() => e=="min" ? "end" : "start")

  )




  // Set up the legend
  var legenditem = d3.select('#legend')
    .selectAll('div.legend--item')
    .data(d3.zip(Object.values(config.essential.legendLabels), config.essential.colour_palette))
    .enter()
    .append('div')
    .attr('class', 'legend--item')

  legenditem.append('div').attr('class', 'legend--icon')
    .style('background-color', function(d) {
      return d[1]
    })

  legenditem.append('div')
    .append('p').attr('class', 'legend--text').html(function(d) {
      return d[0]
    })

  //create link to source
  d3.select("#source")
    .text("Source – " + config.essential.sourceText)

  //use pym to calculate chart dimensions
  if (pymChild) {
    pymChild.sendHeight();
  }
}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      // y = text.attr("y"),
      x = text.attr("x"),
      dy = parseFloat(text.attr("dy")),
      tspan = text.text(null).append("tspan").attr('x', x);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr('x', x).attr("dy", lineHeight + "em").text(word);
      }
    }
    var breaks = text.selectAll("tspan").size();
    text.attr("y", function() {
      return -6 * (breaks - 1);
    });
  });

}

d3.csv(config.essential.graphic_data_url)
  .then(data => {
    //load chart data
    graphic_data = data

    //use pym to create iframed chart dependent on specified variables
    pymChild = new pym.Child({
      renderCallback: drawGraphic
    });
  });
