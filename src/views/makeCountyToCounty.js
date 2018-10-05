
import * as chroma from 'chroma-js'
import * as d3 from 'd3'
import * as topojson from 'topojson'
// import {debounce} from 'lodash'

const unpack = s => {
  return s.split(',').reduce((memo, str) => {
      var parts = str.split(':');
      memo[parts[0]] = parts[1];
      return memo;
  }, {})
}
const utils = {
  lsadLookup: {
    '00': 'NA',
    '03': 'City',
    '04': 'Borough',
    '05': 'Census Area',
    '06': 'County',
    '12': 'Municipality',
    '15': 'Parish',
    '25': 'City'
  },
  NICE_NAMES: {
    '36005': 'the Bronx',
    '36061': 'Manhattan',
    '36047': 'Brooklyn',
    '36085': 'Staten Island',
    '11001': 'Washington D.C.',
    '24510': 'Baltimore City',
    '51600': 'Fairfax City'
  },
  getAbbrev: st => utils.abbrevs[st.toUpperCase()] || '',
  getStateByFips: fips => utils.fipsTable[fips] || '',
  getName: st => utils.names[st] || '',
  unpack: unpack,
  abbrevs: unpack('AL:Ala.,AK:Alaska,AZ:Ariz.,AR:Ark.,CA:Calif.,CO:Colo.,CT:Conn.,DE:Del.,DC:D.C.,FL:Fla.,GA:Ga.,HI:Hawaii,ID:Idaho,IL:Ill.,IN:Ind.,IA:Iowa,KS:Kan.,KY:Ky.,LA:La.,ME:Me.,MD:Md.,MA:Mass.,MI:Mich.,MN:Minn.,MS:Miss.,MO:Mo.,MT:Mont.,NE:Neb.,NV:Nev.,NH:N.H.,NJ:N.J.,NM:N.M.,NY:N.Y.,NC:N.C.,ND:N.D.,OH:Ohio,OK:Okla.,OR:Ore.,PA:Pa.,PR:P.R.,RI:R.I.,SC:S.C.,SD:S.D.,TN:Tenn.,TX:Tex.,UT:Utah,VT:Vt.,VA:Va.,WA:Wash.,WV:W.Va.,WI:Wis.,WY:Wyo.'),
  fipsTable: unpack('01:AL,02:AK,04:AZ,05:AR,06:CA,08:CO,09:CT,10:DE,11:DC,12:FL,13:GA,15:HI,16:ID,17:IL,18:IN,19:IA,20:KS,21:KY,22:LA,23:ME,24:MD,25:MA,26:MI,27:MN,28:MS,29:MO,30:MT,31:NE,32:NV,33:NH,34:NJ,35:NM,36:NY,37:NC,38:ND,39:OH,40:OK,41:OR,42:PA,72:PR,44:RI,45:SC,46:SD,47:TN,48:TX,49:UT,50:VT,51:VA,53:WA,54:WV,55:WI,56:WY'),
  names: unpack('AL:Alabama,AK:Alaska,AZ:Arizona,AR:Arkansas,CA:California,CO:Colorado,CT:Connecticut,DE:Delaware,DC:D.C.,FL:Florida,GA:Georgia,HI:Hawaii,ID:Idaho,IL:Illinois,IN:Indiana,IA:Iowa,KS:Kansas,KY:Kentucky,LA:Louisiana,ME:Maine,MD:Maryland,MA:Massachusetts,MI:Michigan,MN:Minnesota,MS:Mississippi,MO:Missouri,MT:Montana,NE:Nebraska,NV:Nevada,NH:New Hampshire,NJ:New Jersey,NM:New Mexico,NY:New York,NC:North Carolina,ND:North Dakota,OH:Ohio,OK:Oklahoma,OR:Oregon,PA:Pennsylvania,PR:Puerto Rico,RI:Rhode Island,SC:South Carolina,SD:South Dakota,TN:Tennessee,TX:Texas,UT:Utah,VT:Vermont,VA:Virginia,WA:Washington,WV:West Virginia,WI:Wisconsin,WY:Wyoming'),
  small: 'VT,MA,NH,RI,CT,DE,MD,NJ,HI,DC'.split(',')
}

const makeCountyToCounty = (us, state, counties, statesMesh, countyToCountyData, countyInfo, topData) => {
  console.log(us, state, counties, statesMesh, countyToCountyData, countyInfo, topData)
    //     var devMode = false; //+window.location.port > 999;
    //     var CANVAS = false;

    //     var isMobile = (magnum.device === "mobile" || innerWidth < 500) ? true : false;
  const formatPercent = d3.format('.0%')
  const formatNumber = d3.format('.1f')
  let th;
  let scale = 2; //indow.devicePixelRatio * 2 || 2;

  var START_VALUE = { STATEFP: '17', GEOID: '17031', NAME: 'Cook', LSAD: '06', nytName: 'Cook County, Ill.' }

  var fipslist = ['select', '17031', '17027']
  var fipsToID = d3.nest()
      .key(d => d.county)
      .object(countyInfo)

  var idToFIPS = d3.nest()
      .key(d => d.id)
      .object(countyInfo)

  var cols = chroma.scale(['#fff', '#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#08589e']).colors(8);
  var color = d3.scaleOrdinal()
      .domain(d3.range(1, 9))
      .range(cols)

  var countyData = counties.map(d => d.properties)
  var nameAndCounty = {};

  countyData.forEach(d => {
      d.nytName = utils.NICE_NAMES[d.GEOID] ? utils.NICE_NAMES[d.GEOID] : `${d.NAME} ${utils.lsadLookup[d.LSAD]}, ${utils.getAbbrev(utils.getStateByFips(d.STATEFP))}`
      nameAndCounty[d.GEOID] = { name: d.nytName };
  })

    // initTypeAhead()
//     // initSearch(countyData)
  var gfk = d3.select('#county-to-county').html('');
  var chartContainer = gfk.append('div.g-county-to-county-container');
  var chartheader = chartContainer.append('div.g-chart-header').html('');
  chartheader.html('The relative probability that someone in any U.S. county has a Facebook friendship link to Cook County, Ill.')
  var mapContainer = chartContainer.append('div.g-county-map').html('');

  // var legendContainer = chartContainer.append('div.g-legend-container').html('');

  // var legendHeader = legendContainer.append('div.g-header').html('Likelihood of friendship')

  // var legend = legendContainer.append('div.g-legend')

  // var bars = legend.selectAll('div.g-bars')
  //   .data(d3.range(1, 9))
  //   .enter()

  // var breaks = {
  //   2: 1,
  //   3: 2,
  //   4: 3,
  //   5: 5,
  //   6: 10,
  //   7: 20,
  //   8: 100
  // }

//   bars.append('div.g-bars')
//     .style('background-color', d => color(d))
//     .selectAll('div.g-bars')
//     .append('div.g-label')
//     .html(d => {
//       if (d % 2 == 0) {
//         return breaks[d] + 'x';
//       }
//     });

//     // //     if (devMode) legend.st({ display: 'none' })

//         // var margin = isMobile ? { top: 0, right: 0, bottom: 0, left: 0 } : { top: 0, right: 0, bottom: 0, left: 0 };
//         var margin = { top: 0, right: 0, bottom: 0, left: 0 }
        
//         var width = mapContainer.node().clientWidth - margin.left - margin.right,
//             height = width * .61 - margin.top - margin.bottom;

//         var proj = d3.geoIdentity()
//           .reflectY(true)
//           .fitSize([width, height], topojson.feature(us, us.objects.counties));

//         var path = d3.geoPath()
//           .projection(proj);

//         var svg = mapContainer.append('svg')
//           .attr('width', width + margin.left + margin.right)
//           .attr('height', height + margin.top + margin.bottom)
//           .append('g')
//           .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
// console.log('SVG', svg)
//         // var connectBlocks = 
//         svg.append('g')
//           .selectAll('.g-connect')
//           .data(counties)
//           .enter()
//           .append('path')
//           .attr('class', d => `g-connect g-${ d.properties.GEOID }`)
//           .attr('d', path)
//           .style('fill', '#fff')
          
//           // connectBlocks

//         var countiesBlocks = svg.append("g").selectAll('.g-county')
//             .data(counties)
//             .enter().append("path")
//             .attr('class', d => `g-county g-${ d.properties.GEOID }`)
//             .attr('d', path)
//             .style('fill', 'transparent')

//         svg.append('path.g-state-innerline')
//             .attr('d', path(statesMesh))

    //     var isClicked = false;

    //     countiesBlocks
    //         .on("mouseover touchmove", d => {
    //             if (isClicked == false) {
    //                 selectCounty(d.properties)
    //             }
    //         })


    //     if (!isMobile) {
    //         countiesBlocks
    //             .on("click", d => {
    //                 isClicked = isClicked == false ? true : false;
    //                 selectCounty(d.properties)
    //             })
    //     }

    //     selectCounty(START_VALUE)

    //     function selectCounty(selectedData) {
    //         var selected_fips = selectedData.GEOID;

    //         countiesBlocks.classed("active", false)
    //         countiesBlocks.classed("clicked", false)

    //         d3.selectAll(`.g-county.g-${ selectedData.GEOID}`).classed("active", true)
    //         if (isClicked == true) d3.selectAll(`.g-county.g-${ selectedData.GEOID}`).classed("clicked", true)

    //         th.val(selectedData.nytName);
    //         legendHeader.html("Likelihood of friendship")
    //         var abbreved = selectedData.nytName.includes(".")
    //         chartheader.html(`The relative probability that someone in any U.S. county has a Facebook friendship link to <em>${selectedData.nytName + (abbreved ? "" : ".")} </em>`)


    //         connectBlocks
    //             .style("fill", makeColor);


    //         if (fipsToID[selected_fips]) {
    //             var county_hash = fipsToID[selected_fips][0].id;
    //             makeTable(county_hash, selected_fips)

    //         }

    //         function makeColor(d) {
    //             var score = findData(selected_fips, d.properties.GEOID);
    //             if (score == "-") {
    //                 console.log("could not find ", d.properties.GEOID)
    //                 return "#000";
    //             } else {
    //                 return color(score);
    //             }
    //         }


    //         function findData(county_fips, connect_fips) {
    //             if (fipsToID[county_fips] && fipsToID[connect_fips]) {
    //                 var county_hash = fipsToID[county_fips][0].id,
    //                     connect_hash = fipsToID[connect_fips][0].id;
    //                 return +countyToCountyData[+county_hash].d[+connect_hash]
    //             } else {
    //                 return "-";
    //             }

    //         }

    //         function makeTable(county_num, county_fips) {
    //             var countyData = countyInfo[county_fips];
    //             var top_n = topData.filter(d => d.county_id == county_num).filter(d => d.connect_id != county_num)

    //             var tblHed = d3.select(".g-top-table-container .g-hed").html("");
    //             tblHed.html(`Counties most closely connected to ${nameAndCounty[county_fips].name}`)
    //             var tblSelect = d3.select(".g-top-table").html("");

    //             var row = tblSelect.selectAll("div.g-row-select")
    //                 .data(top_n)
    //                 .enter()
    //                 .append("div")
    //                 .attr("class", (d, i) => `g-row-select rank-${i}`)

    //             row
    //                 .append("p")
    //                 .html((d, i) => {
    //                     if (idToFIPS[d.connect_id]) {
    //                         var connect_fips = idToFIPS[d.connect_id][0].county;
    //                         if (county_fips != connect_fips) { // some counties best friends are NOT themselves, most are
    //                             return `<span class="g-rank">${i+1}</span> ${nameAndCounty[connect_fips].name} `
    //                         }
    //                     }

    //                 })

    //             var nearestData = countyInfo.filter(d => d.county == county_fips)[0]
    //             //nearest friends
    //             var nearestFriendsContainer = d3.select(".g-nearest-friends")
    //             var nearestFriendsHed = d3.select(".g-nearest-friends .g-hed").html("")
    //             var nearestFriendsTbl = d3.select(".g-nearest-table").html("");
    //             nearestFriendsHed.html("Share of friends who live within ...");

    //             nearestFriendsTbl
    //                 .append("span.g-nearest-row")
    //                 .html(`50 miles: <span class=g-number>${ isNaN(+nearestData.sh_usfr_within_50miles) ? "no data" : formatPercent(+nearestData.sh_usfr_within_50miles) }</span>,`)
    //             nearestFriendsTbl
    //                 .append("span.g-nearest-row")
    //                 .html(`100 miles: <span class=g-number>${ isNaN(+nearestData.sh_usfr_within_50miles) ?  "no data" : formatPercent(+nearestData.sh_usfr_within_100miles) }</span>,`)
    //             nearestFriendsTbl
    //                 .append("span.g-nearest-row")
    //                 .html(`500 miles: <span class=g-number>${ isNaN(+nearestData.sh_usfr_within_50miles) ? "no data" : formatPercent(+nearestData.sh_usfr_within_500miles) }</span>`)
    //         }


    //     }

    //     window.selectCounty = selectCounty;

        // function initTypeAhead() {
        //     var matches = [];
        //     d3.selectAll(".tt-hint").remove();
        //     d3.select("#tt-input-g").attr("placeholder", "")

        //     th = $(".g-place-selector input").typeahead({
        //         minLength: 2,
        //         highlight: true
        //     }, {
        //         displayKey: 'nytName',
        //         source: function(query, cb) {
        //             matches = countyData.filter(function(r) {
        //                 return r.nytName.toLowerCase().indexOf(query.toLowerCase()) >= 0;
        //             });
        //             var maxCount = isMobile ? 5 : 7;
        //             cb(matches.slice(0, maxCount));
        //         }
        //     }).on('typeahead:selected', function(evt, res) {
        //         selectCounty(res)
        //         evt.stopPropagation();
        //         evt.preventDefault();
        //     })
        // }
    // }
}

export default makeCountyToCounty
