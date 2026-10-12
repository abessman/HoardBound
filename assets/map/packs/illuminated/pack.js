/* Generated from pack.json by tools/mappack.js: edit pack.json, then run node tools/mappack.js illuminated */
HB.mapAssets && HB.mapAssets.definePack({
  "schemaVersion": 1,
  "name": "illuminated",
  "style": {
    "road": {
      "color": "#655039",
      "width": 0.9,
      "laneWidth": 0.65,
      "dash": [
        2.5,
        3.5
      ],
      "alpha": 0.7,
      "laneAlpha": 0.48
    },
    "river": {
      "color": "rgba(69,109,134,0.70)",
      "baseWidth": 0.7,
      "perWidth": 0.5
    },
    "coast": {
      "color": "#65523b",
      "width": 1.1
    },
    "water": {
      "color": [
        106,
        139,
        154
      ],
      "alpha": 0.055,
      "alphaPerDepth": 0.023
    }
  },
  "assets": {
    "map.terrain.mountain": {
      "variants": [
        {
          "id": "mountain-a",
          "src": "terrain/mountain-a@8x.png",
          "sourceSize": [
            240,
            200
          ],
          "logicalSize": [
            30,
            25
          ],
          "anchorPx": [
            120,
            184
          ],
          "contentBoundsPx": [
            8,
            39,
            224,
            145
          ],
          "sampling": "smooth",
          "allowFlipX": false
        },
        {
          "id": "mountain-b",
          "src": "terrain/mountain-b@8x.png",
          "sourceSize": [
            240,
            200
          ],
          "logicalSize": [
            30,
            25
          ],
          "anchorPx": [
            120,
            184
          ],
          "contentBoundsPx": [
            8,
            9,
            224,
            175
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.hill": {
      "variants": [
        {
          "id": "hill",
          "src": "terrain/hill@8x.png",
          "sourceSize": [
            176,
            80
          ],
          "logicalSize": [
            22,
            10
          ],
          "anchorPx": [
            88,
            64
          ],
          "contentBoundsPx": [
            8,
            37,
            160,
            27
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.tree.round": {
      "variants": [
        {
          "id": "tree-round",
          "src": "terrain/tree-round@8x.png",
          "sourceSize": [
            104,
            112
          ],
          "logicalSize": [
            13,
            14
          ],
          "anchorPx": [
            52.0,
            88
          ],
          "contentBoundsPx": [
            8,
            24,
            88,
            64
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.tree.pine": {
      "variants": [
        {
          "id": "tree-pine",
          "src": "terrain/tree-pine@8x.png",
          "sourceSize": [
            64,
            120
          ],
          "logicalSize": [
            8,
            15
          ],
          "anchorPx": [
            32,
            96
          ],
          "contentBoundsPx": [
            11,
            8,
            42,
            88
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.farm": {
      "variants": [
        {
          "id": "farm",
          "src": "places/farm@8x.png",
          "sourceSize": [
            184,
            120
          ],
          "logicalSize": [
            23,
            15
          ],
          "anchorPx": [
            92.0,
            104
          ],
          "contentBoundsPx": [
            8,
            23,
            168,
            81
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.village": {
      "variants": [
        {
          "id": "village",
          "src": "places/village@8x.png",
          "sourceSize": [
            248,
            176
          ],
          "logicalSize": [
            31,
            22
          ],
          "anchorPx": [
            124.0,
            160
          ],
          "contentBoundsPx": [
            8,
            55,
            232,
            105
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.town": {
      "variants": [
        {
          "id": "town",
          "src": "places/town@8x.png",
          "sourceSize": [
            320,
            240
          ],
          "logicalSize": [
            40,
            30
          ],
          "anchorPx": [
            160,
            224
          ],
          "contentBoundsPx": [
            8,
            41,
            304,
            183
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.castle": {
      "variants": [
        {
          "id": "castle",
          "src": "places/castle@8x.png",
          "sourceSize": [
            256,
            336
          ],
          "logicalSize": [
            32,
            42
          ],
          "anchorPx": [
            128,
            320
          ],
          "contentBoundsPx": [
            25,
            8,
            206,
            312
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "attach": {
            "flag": [
              128,
              8
            ]
          }
        }
      ]
    }
  }
}, "illuminated");
