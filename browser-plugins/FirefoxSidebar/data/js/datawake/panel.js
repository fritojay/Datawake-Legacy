var addon = self;


var panelApp = angular.module('panelApp', ["ngRoute", "ngSanitize"]).config(['$provide', function($provide) {
  $provide.decorator('$sniffer', ['$delegate', function($delegate) {
    $delegate.history = false;
    return $delegate;
  }]);
}]);


panelApp.controller("PanelCtrl", function($scope, $document) {
  $scope.teamSpinner = true;
  $scope.domainSpinner = true;
  $scope.trailSpinner = true;
  $scope.extracted_tools = [];
  $scope.invalid = {};
  $scope.headerPartial = "partials/header-partial.html";
  $scope.createTrailPartial = "partials/trail-modal-partial.html";
  $scope.createDomainPartial = "partials/domain-modal-partial.html";
  $scope.createTeamPartial = "partials/team-modal-partial.html"
  $scope.teamMembers = null;
  if (!$scope.domains) $scope.domains = [];
  $scope.trails = []

  addon.port.on("ready", function(prefs) {
    console.log("Got Ready")
    console.log("Datawake Prefs")
    console.log(prefs.datawakeInfo)
    $scope.datawake = prefs.datawakeInfo;

    $scope.datawake.domain = 'memex'
    $scope.datawake.trail = 'trail'

    $scope.current_url = prefs.current_url;
    $scope.lookaheadEnabled = prefs.useLookahead;
    $scope.domainFeaturesEnabled = prefs.useDomainFeatures;
    $scope.rankingEnabled = prefs.useRanking;
    $scope.versionNumber = prefs.versionNumber;
    $scope.pageVisits = prefs.pageVisits;
    $scope.starUrl = prefs.starUrl
  });

  console.log($scope.datawake);

  addon.port.on("trailEntities", function(entities_obj) {
    console.log("Got trail entities")
    console.log(entities_obj)
    $scope.irrelevantEntities = entities_obj.irrelevantEntities;
    $scope.trailEntities = entities_obj.entities;
    $scope.trailEntitiesIter = createIterableEntityListForSorting(entities_obj.entities);
    $scope.irrelevantEntitiesIter = createIterableEntityListForSorting(entities_obj.irrelevantEntities);
    $scope.$apply();
  });

  addon.port.on("trailLinks", function(links_obj) {
    console.log("got trail links")
    console.log(links_obj)
    $scope.visitedLinks = links_obj.visited;
    $scope.notVisitedLinks = links_obj.notVisited;
    $scope.$apply();
  });

  addon.port.on("ranking", function(rankingInfo) {
    $scope.$apply(function() {
      $scope.ranking = rankingInfo.ranking;
      var starRating = $("#star_rating");
      starRating.attr("data-average", rankingInfo.ranking);
      createStarRating(addon.options.starUrl);
    });
  });

  addon.port.on("features", function(features) {
    $scope.extracted_entities_dict = features;
    $scope.$apply();
  });

  addon.port.on("domain_features", function(features) {
    $scope.domain_extracted_entities_dict = features;
    $scope.$apply();
  });


  addon.port.on("externalLinks", function(links) {
    console.debug("Loading External Entities..");
    $scope.$apply(function() {
      $scope.extracted_tools = links;
    });
  });


  $scope.signOut = function() {
    addon.port.emit("signOut");
  }

  $scope.openExternalLink = function(externalUrl) {
    addon.port.emit("openExternalLink", {
      externalUrl: externalUrl
    });
  };

  $scope.markInvalid = function(type, entity) {
    var postObj = {};
    postObj.team_id = $scope.datawake.team.id;
    postObj.domain_id = $scope.datawake.domain.id;
    postObj.trail_id = $scope.datawake.trail.id;
    postObj.feature_type = type;
    postObj.feature_value = entity;
    addon.port.emit("markInvalid", postObj);
    $scope.invalid[entity] = true;
  };

  addon.port.on("markedFeatures", function(features) {
    for (i in features) {
      var feature = features[i];
      $scope.invalid[feature.value] = true;
    }
    $scope.$apply()


  });

  $scope.isExtracted = function(type, name) {
    if ($scope.entities_in_domain && $scope.entities_in_domain.hasOwnProperty(type)) {
      return $scope.entities_in_domain[type].indexOf(name) >= 0;
    }
  };

  $scope.editFeatures = function() {
    if (!$scope.allowEditFeatures) {
      $scope.allowEditFeatures = true;
    } else {
      $scope.allowEditFeatures = false;
    }
  }

  $scope.getHostName = function(url) {
    //For some reason, sometimes errant spaces were apearing in the urls.
    url = url.replace(/\s+/g, '');
    return new URL(url).hostname
  };

  $scope.showEntities = function(link) {
    if (!link.show) {
      var data = {};
      // data.domain = $scope.datawake.domain.name;
      // data.trail = $scope.datawake.trail.name;
      data.domain = 'memex';
      data.trail = 'trail';

      data.url = link.url;
      addon.port.emit("getUrlEntities", data);

      function updateLink(entities) {
        link.entities = entities;
        link.show = !link.show;
        $scope.$apply();
      }

      addon.port.once("urlEntities", updateLink);
    } else {
      link.show = !link.show;
    }
  };

  addon.port.on("infosaved", function(datawakeinfo) {
    $scope.datawake = datawakeinfo;
    $scope.$apply()
    console.log("ON INFO SAVED")
    console.log($scope.datawake)
  })

  $scope.refreshWebPages = function () {
      addon.port.emit("refreshWebPages", {domain: "memex", trail: "trail"});
  };

  $scope.refreshEntities = function () {
      addon.port.emit("refreshEntities", {domain: "memex", trail: "trail"});
  };

  function createIterableEntityListForSorting(entities) {
    var arr = [];
    $.map(entities, function(item, key) {
      arr.push({
        entity: key,
        rank: item
      });
    });
    return arr;
  }


  // function createStarRating(starUrl) {
  //   var starRating = $("#star_rating");
  //   starRating.jRating({
  //     type: 'big', // type of the rate.. can be set to 'small' or 'big'
  //     length: 10, // nb of stars
  //     rateMax: 10,
  //     bigStarsPath: starUrl + 'stars.png',
  //     smallStarsPath: starUrl + 'small.png',
  //     sendRequest: false,
  //     canRateAgain: true,
  //     nbRates: 9999999,
  //     onClick: function(element, rate) {
  //       setUrlRank(rate);
  //       $scope.$apply(function() {
  //         $scope.ranking = rate;
  //       });
  //     }
  //   });
  //
  // }

  function setUrlRank(rank) {
    var rank_data = {
      team_id: $scope.datawake.team.id,
      domain_id: $scope.datawake.domain.id,
      trail_id: $scope.datawake.trail.id,
      url: $scope.current_url,
      rank: rank
    };
    addon.port.emit("setUrlRank", rank_data);
  }

  addon.port.emit("init");

});

panelApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
    // when('/features/all', {
    //   templateUrl: 'partials/extracted-entities-partial.html'
    // }).
    // when('/features/domain', {
    //   templateUrl: 'partials/domain-extracted-partial.html'
    // }).
    // when('/features/manual', {
    //   templateUrl: 'partials/manual-features-partial.html'
    // }).
    when('/trail/explored', {
      templateUrl: 'partials/trail-based-explored-partial.html'
    }).
    when('/trail/unexplored', {
      templateUrl: 'partials/trail-based-unexplored-partial.html'
    }).
    when('/trail/entities/relevant', {
      templateUrl: 'partials/trail-based-relevant-entities-partial.html'
    }).
    when('/trail/entities/irrelevant', {
      templateUrl: 'partials/trail-based-irrelevant-entities-partial.html'
    }).
    otherwise({
      redirectTo: 'partials/extracted-entities-partial.html'
    });
  }
]);