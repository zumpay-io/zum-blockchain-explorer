$(document).ready(function () {
  localData.poolTable = $('#pools').DataTable({
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: "No Mining Pools Found"
    },
    columnDefs: [{
        targets: [0, 1, 2],
        visible: false,
        search: false
      },
      {
        targets: [3],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = '<a href="' + data.url + '" target="_blank">' + data.name + '</a>'
          } else if (type === 'sort') {
            data = data.name
          }
          return data
        }
      },
      {
        targets: [5],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = numeral(data).format('0,0') + ' H/s'
          }
          return data
        }
      },
      {
        targets: [8],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = numeral(data / Math.pow(10, ExplorerConfig.decimalPoints)).format('0,0.00') + ' ' + ExplorerConfig.ticker
          }
          return data
        }
      },
      {
        targets: [9],
        render: function (data, type, row, meta) {
          if (type === 'display') {
            data = (new Date(data)).toGMTString()
          }
          return data
        }
      }
    ],
    order: [
      [0, 'asc']
    ],
    autoWidth: false
  }).columns.adjust().responsive.recalc().draw(false)

  google.charts.setOnLoadCallback(function () {
    getCurrentNetworkHashRateLoop()
    getAndDrawPoolStats()
  })
})

function getAndDrawPoolStats() {
  $.ajax({
    url: ExplorerConfig.poolApiUrl,
    dataType: 'json',
    method: 'GET',
    cache: 'true',
    success: function (data) {
      localData.poolTable.clear()
      for (var i = 0; i < data.length; i++) {
        var pool = data[i]
        localData.poolTable.row.add([
          pool.name,
          pool.api,
          pool.type,
          {
            name: pool.name,
            url: pool.url
          },
          numeral(pool.height).format('0,0'),
          pool.hashrate,
          numeral(pool.miners).format('0,0'),
          numeral(pool.fee).format('0,0.00') + '%',
          pool.minPayout,
          pool.lastblock
        ])
      }
      localData.poolTable.draw(false)
      drawPoolPieChart()
    },
    error: function () {
      alert('Could not retrieve pool statistics from + ' + ExplorerConfig.poolApiUrl)
    }
  })
  setTimeout(() => {
    getAndDrawPoolStats()
  }, 15000)
}

function drawPoolPieChart() {
  var data = [
    ['Pool', 'Hashrate']
  ]
  var slices = {}

  var count = 0
  var currentHashRate = localData.networkHashRate
  localData.poolTable.rows().every(function (idx, tableLoop, rowLoop) {
    var row = this.data()
    data.push([row[3].name, row[5]])
    currentHashRate = currentHashRate - row[5]
    slices[count] = {
      offset: 0
    }
    count++
  })
  if (currentHashRate > 0) {
    data.push(['Unknown', currentHashRate])
    slices[count] = {
      offset: 0
    }
    count++
  }

  var options = {
    is3D: false,
    colors: ['#212721', '#fac5c3', '#6d9eeb', '#40c18e', '#8e7cc3', '#00853d', '#f6b26b', '#45818e', '#de5f5f'],
    chartArea: {
      width: '100%'
    },
    pieHole: 0.45,
    legend: 'none',
    pieSliceText: 'label',
    height: 800,
    slices: slices
  }

  try {
    var chart = new google.visualization.PieChart(document.getElementById('poolPieChart'))
    chart.draw(google.visualization.arrayToDataTable(data), options)
  } catch (e) {}
}