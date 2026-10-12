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
    },
    "inkFinish": true
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
    },
    "map.place.mine": {
      "variants": [
        {
          "id": "mine",
          "src": "places/mine@4x.png",
          "sourceSize": [
            120,
            84
          ],
          "logicalSize": [
            30,
            21
          ],
          "anchorPx": [
            60.0,
            76
          ],
          "contentBoundsPx": [
            4,
            12,
            112,
            64
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.wagon": {
      "variants": [
        {
          "id": "wagon",
          "src": "markers/wagon@4x.png",
          "sourceSize": [
            88,
            64
          ],
          "logicalSize": [
            22,
            16
          ],
          "anchorPx": [
            44.0,
            56
          ],
          "contentBoundsPx": [
            4,
            6,
            80,
            50
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.city": {
      "variants": [
        {
          "id": "city",
          "src": "places/city@4x.png",
          "sourceSize": [
            172,
            204
          ],
          "logicalSize": [
            43,
            51
          ],
          "anchorPx": [
            86.0,
            196
          ],
          "contentBoundsPx": [
            4,
            26,
            164,
            170
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.camp": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.hold": {
      "variants": [
        {
          "id": "hold",
          "src": "places/hold@4x.png",
          "sourceSize": [
            176,
            132
          ],
          "logicalSize": [
            44,
            33
          ],
          "anchorPx": [
            88.0,
            124
          ],
          "contentBoundsPx": [
            4,
            14,
            168,
            110
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.glade": {
      "variants": [
        {
          "id": "glade",
          "src": "places/glade@4x.png",
          "sourceSize": [
            172,
            172
          ],
          "logicalSize": [
            43,
            43
          ],
          "anchorPx": [
            86.0,
            164
          ],
          "contentBoundsPx": [
            4,
            31,
            164,
            133
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.monastery": {
      "variants": [
        {
          "id": "monastery",
          "src": "places/monastery@4x.png",
          "sourceSize": [
            128,
            124
          ],
          "logicalSize": [
            32,
            31
          ],
          "anchorPx": [
            64.0,
            116
          ],
          "contentBoundsPx": [
            4,
            47,
            120,
            69
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.shrine": {
      "variants": [
        {
          "id": "shrine",
          "src": "places/shrine@4x.png",
          "sourceSize": [
            76,
            88
          ],
          "logicalSize": [
            19,
            22
          ],
          "anchorPx": [
            38.0,
            80
          ],
          "contentBoundsPx": [
            10,
            4,
            56,
            76
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.ruin": {
      "variants": [
        {
          "id": "ruin",
          "src": "places/ruin@4x.png",
          "sourceSize": [
            136,
            96
          ],
          "logicalSize": [
            34,
            24
          ],
          "anchorPx": [
            68.0,
            88
          ],
          "contentBoundsPx": [
            12,
            4,
            112,
            84
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.warren": {
      "variants": [
        {
          "id": "warren",
          "src": "places/warren@4x.png",
          "sourceSize": [
            124,
            88
          ],
          "logicalSize": [
            31,
            22
          ],
          "anchorPx": [
            62.0,
            80
          ],
          "contentBoundsPx": [
            4,
            25,
            116,
            55
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.tower": {
      "variants": [
        {
          "id": "tower",
          "src": "places/tower@4x.png",
          "sourceSize": [
            72,
            184
          ],
          "logicalSize": [
            18,
            46
          ],
          "anchorPx": [
            36.0,
            176
          ],
          "contentBoundsPx": [
            4,
            9,
            64,
            167
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.lair": {
      "variants": [
        {
          "id": "lair",
          "src": "places/lair@4x.png",
          "sourceSize": [
            144,
            84
          ],
          "logicalSize": [
            36,
            21
          ],
          "anchorPx": [
            72.0,
            76
          ],
          "contentBoundsPx": [
            8,
            4,
            128,
            72
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.rivalLair": {
      "variants": [
        {
          "id": "rival-lair",
          "src": "places/rival-lair@4x.png",
          "sourceSize": [
            164,
            176
          ],
          "logicalSize": [
            41,
            44
          ],
          "anchorPx": [
            82.0,
            168
          ],
          "contentBoundsPx": [
            4,
            26,
            156,
            142
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.battlefield": {
      "variants": [
        {
          "id": "battlefield",
          "src": "places/battlefield@4x.png",
          "sourceSize": [
            116,
            88
          ],
          "logicalSize": [
            29,
            22
          ],
          "anchorPx": [
            58.0,
            80
          ],
          "contentBoundsPx": [
            4,
            26,
            108,
            54
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.fortress": {
      "variants": [
        {
          "id": "fortress",
          "src": "places/fortress@4x.png",
          "sourceSize": [
            192,
            172
          ],
          "logicalSize": [
            48,
            43
          ],
          "anchorPx": [
            96.0,
            164
          ],
          "contentBoundsPx": [
            14,
            4,
            163,
            160
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.stronghold.warlord": {
      "variants": [
        {
          "id": "warlord",
          "src": "places/warlord@4x.png",
          "sourceSize": [
            204,
            128
          ],
          "logicalSize": [
            51,
            32
          ],
          "anchorPx": [
            102.0,
            120
          ],
          "contentBoundsPx": [
            15,
            4,
            174,
            116
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.stronghold.sorcerer": {
      "variants": [
        {
          "id": "sorcerer",
          "src": "places/sorcerer@4x.png",
          "sourceSize": [
            96,
            168
          ],
          "logicalSize": [
            24,
            42
          ],
          "anchorPx": [
            48.0,
            160
          ],
          "contentBoundsPx": [
            4,
            42,
            88,
            118
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.stronghold.blightmother": {
      "variants": [
        {
          "id": "blightmother",
          "src": "places/blightmother@4x.png",
          "sourceSize": [
            172,
            120
          ],
          "logicalSize": [
            43,
            30
          ],
          "anchorPx": [
            86.0,
            112
          ],
          "contentBoundsPx": [
            18,
            4,
            137,
            108
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.sanctuary": {
      "variants": [
        {
          "id": "sanctuary",
          "src": "places/sanctuary@4x.png",
          "sourceSize": [
            140,
            112
          ],
          "logicalSize": [
            35,
            28
          ],
          "anchorPx": [
            70.0,
            104
          ],
          "contentBoundsPx": [
            34,
            4,
            71,
            100
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.mountain.jagged": {
      "variants": [
        {
          "id": "jagged",
          "src": "terrain/jagged@4x.png",
          "sourceSize": [
            132,
            112
          ],
          "logicalSize": [
            33,
            28
          ],
          "anchorPx": [
            66.0,
            104
          ],
          "contentBoundsPx": [
            4,
            19,
            124,
            85
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.tree.bare": {
      "variants": [
        {
          "id": "tree-bare",
          "src": "terrain/tree-bare@4x.png",
          "sourceSize": [
            40,
            60
          ],
          "logicalSize": [
            10,
            15
          ],
          "anchorPx": [
            20.0,
            52
          ],
          "contentBoundsPx": [
            4,
            20,
            32,
            32
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.tree.burned": {
      "variants": [
        {
          "id": "tree-burned",
          "src": "terrain/tree-burned@4x.png",
          "sourceSize": [
            32,
            48
          ],
          "logicalSize": [
            8,
            12
          ],
          "anchorPx": [
            16.0,
            40
          ],
          "contentBoundsPx": [
            4,
            20,
            24,
            20
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.mountain.snow": {
      "variants": [
        {
          "id": "snowpeak",
          "src": "terrain/snowpeak@4x.png",
          "sourceSize": [
            120,
            116
          ],
          "logicalSize": [
            30,
            29
          ],
          "anchorPx": [
            60.0,
            108
          ],
          "contentBoundsPx": [
            4,
            23,
            112,
            85
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.walker": {
      "variants": [
        {
          "id": "walker",
          "src": "markers/walker@4x.png",
          "sourceSize": [
            52,
            80
          ],
          "logicalSize": [
            13,
            20
          ],
          "anchorPx": [
            26.0,
            72
          ],
          "contentBoundsPx": [
            4,
            16,
            44,
            56
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.walker.hunter": {
      "variants": [
        {
          "id": "hunter",
          "src": "markers/hunter@4x.png",
          "sourceSize": [
            56,
            84
          ],
          "logicalSize": [
            14,
            21
          ],
          "anchorPx": [
            28.0,
            76
          ],
          "contentBoundsPx": [
            4,
            29,
            48,
            47
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.banner": {
      "variants": [
        {
          "id": "army",
          "src": "markers/army@4x.png",
          "sourceSize": [
            88,
            92
          ],
          "logicalSize": [
            22,
            23
          ],
          "anchorPx": [
            44.0,
            84
          ],
          "contentBoundsPx": [
            12,
            4,
            65,
            80
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "army"
        }
      ]
    },
    "map.home.tyrannical.1": {
      "variants": [
        {
          "id": "dark-camp",
          "src": "places/dark-camp@4x.png",
          "sourceSize": [
            136,
            80
          ],
          "logicalSize": [
            34,
            20
          ],
          "anchorPx": [
            68.0,
            72
          ],
          "contentBoundsPx": [
            8,
            4,
            121,
            68
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.home.benevolent.4": {
      "variants": [
        {
          "id": "holy-home",
          "src": "places/holy-home@4x.png",
          "sourceSize": [
            240,
            156
          ],
          "logicalSize": [
            60,
            39
          ],
          "anchorPx": [
            120.0,
            148
          ],
          "contentBoundsPx": [
            19,
            4,
            202,
            144
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.dragon.flying": {
      "variants": [
        {
          "id": "dragon-flight",
          "src": "markers/dragon-flight@8x.png",
          "sourceSize": [
            288,
            240
          ],
          "logicalSize": [
            36,
            30
          ],
          "anchorPx": [
            144.0,
            120.0
          ],
          "contentBoundsPx": [
            8,
            59,
            272,
            165
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.dragon.resting": {
      "variants": [
        {
          "id": "dragon-rest",
          "src": "markers/dragon-rest@8x.png",
          "sourceSize": [
            288,
            208
          ],
          "logicalSize": [
            36,
            26
          ],
          "anchorPx": [
            144.0,
            104.0
          ],
          "contentBoundsPx": [
            8,
            46,
            272,
            146
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.dragon": {
      "variants": [
        {
          "id": "dragon-rest",
          "src": "markers/dragon-rest@8x.png",
          "sourceSize": [
            288,
            208
          ],
          "logicalSize": [
            36,
            26
          ],
          "anchorPx": [
            144.0,
            104.0
          ],
          "contentBoundsPx": [
            8,
            46,
            272,
            146
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.marker.wagon.rich": {
      "variants": [
        {
          "id": "wagon",
          "src": "markers/wagon@4x.png",
          "sourceSize": [
            88,
            64
          ],
          "logicalSize": [
            22,
            16
          ],
          "anchorPx": [
            44.0,
            56
          ],
          "contentBoundsPx": [
            4,
            6,
            80,
            50
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rich"
        }
      ]
    },
    "map.terrain.mountain.peak": {
      "variants": [
        {
          "id": "snowpeak",
          "src": "terrain/snowpeak@4x.png",
          "sourceSize": [
            120,
            116
          ],
          "logicalSize": [
            30,
            29
          ],
          "anchorPx": [
            60.0,
            108
          ],
          "contentBoundsPx": [
            4,
            23,
            112,
            85
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.terrain.mountain.jagged.deep": {
      "variants": [
        {
          "id": "jagged",
          "src": "terrain/jagged@4x.png",
          "sourceSize": [
            132,
            112
          ],
          "logicalSize": [
            33,
            28
          ],
          "anchorPx": [
            66.0,
            104
          ],
          "contentBoundsPx": [
            4,
            19,
            124,
            85
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "deep"
        }
      ]
    },
    "map.place.city.great": {
      "variants": [
        {
          "id": "city",
          "src": "places/city@4x.png",
          "sourceSize": [
            172,
            204
          ],
          "logicalSize": [
            49,
            57
          ],
          "anchorPx": [
            86.0,
            196
          ],
          "contentBoundsPx": [
            4,
            26,
            164,
            170
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true
        }
      ]
    },
    "map.place.stronghold": {
      "variants": [
        {
          "id": "warlord",
          "src": "places/warlord@4x.png",
          "sourceSize": [
            204,
            128
          ],
          "logicalSize": [
            51,
            32
          ],
          "anchorPx": [
            102.0,
            120
          ],
          "contentBoundsPx": [
            15,
            4,
            174,
            116
          ],
          "sampling": "smooth",
          "allowFlipX": false
        }
      ]
    },
    "map.place.camp.bandit": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "bandit"
        }
      ]
    },
    "map.place.camp.goblin": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "goblin"
        }
      ]
    },
    "map.place.camp.hunter": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "hunter"
        }
      ]
    },
    "map.place.camp.military": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "military"
        }
      ]
    },
    "map.home.benevolent.1": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            27,
            16
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true
        }
      ]
    },
    "map.home.benevolent.2": {
      "variants": [
        {
          "id": "village",
          "src": "places/village@8x.png",
          "sourceSize": [
            248,
            176
          ],
          "logicalSize": [
            40,
            26
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
          "allowFlipX": false,
          "allowStretch": true,
          "decor": "fields"
        }
      ]
    },
    "map.home.benevolent.3": {
      "variants": [
        {
          "id": "town",
          "src": "places/town@8x.png",
          "sourceSize": [
            320,
            240
          ],
          "logicalSize": [
            48,
            34
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
          "allowFlipX": false,
          "allowStretch": true,
          "decor": "fields"
        }
      ]
    },
    "map.home.tyrannical.2": {
      "variants": [
        {
          "id": "warlord",
          "src": "places/warlord@4x.png",
          "sourceSize": [
            204,
            128
          ],
          "logicalSize": [
            50,
            27
          ],
          "anchorPx": [
            102.0,
            120
          ],
          "contentBoundsPx": [
            15,
            4,
            174,
            116
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true
        }
      ]
    },
    "map.home.tyrannical.3": {
      "variants": [
        {
          "id": "sorcerer",
          "src": "places/sorcerer@4x.png",
          "sourceSize": [
            96,
            168
          ],
          "logicalSize": [
            39,
            42
          ],
          "anchorPx": [
            48.0,
            160
          ],
          "contentBoundsPx": [
            4,
            42,
            88,
            118
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true
        }
      ]
    },
    "map.home.tyrannical.4": {
      "variants": [
        {
          "id": "fortress",
          "src": "places/fortress@4x.png",
          "sourceSize": [
            192,
            172
          ],
          "logicalSize": [
            61,
            44
          ],
          "anchorPx": [
            96.0,
            164
          ],
          "contentBoundsPx": [
            14,
            4,
            163,
            160
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true
        }
      ]
    },
    "map.place.farm.burned": {
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
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.farm.ruin": {
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
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.village.burned": {
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
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.village.ruin": {
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
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.town.burned": {
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
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.town.ruin": {
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
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.castle.burned": {
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
          },
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.castle.ruin": {
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
          },
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.mine.burned": {
      "variants": [
        {
          "id": "mine",
          "src": "places/mine@4x.png",
          "sourceSize": [
            120,
            84
          ],
          "logicalSize": [
            30,
            21
          ],
          "anchorPx": [
            60.0,
            76
          ],
          "contentBoundsPx": [
            4,
            12,
            112,
            64
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.mine.ruin": {
      "variants": [
        {
          "id": "mine",
          "src": "places/mine@4x.png",
          "sourceSize": [
            120,
            84
          ],
          "logicalSize": [
            30,
            21
          ],
          "anchorPx": [
            60.0,
            76
          ],
          "contentBoundsPx": [
            4,
            12,
            112,
            64
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.city.burned": {
      "variants": [
        {
          "id": "city",
          "src": "places/city@4x.png",
          "sourceSize": [
            172,
            204
          ],
          "logicalSize": [
            43,
            51
          ],
          "anchorPx": [
            86.0,
            196
          ],
          "contentBoundsPx": [
            4,
            26,
            164,
            170
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.city.ruin": {
      "variants": [
        {
          "id": "city",
          "src": "places/city@4x.png",
          "sourceSize": [
            172,
            204
          ],
          "logicalSize": [
            43,
            51
          ],
          "anchorPx": [
            86.0,
            196
          ],
          "contentBoundsPx": [
            4,
            26,
            164,
            170
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.camp.burned": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.camp.ruin": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.hold.burned": {
      "variants": [
        {
          "id": "hold",
          "src": "places/hold@4x.png",
          "sourceSize": [
            176,
            132
          ],
          "logicalSize": [
            44,
            33
          ],
          "anchorPx": [
            88.0,
            124
          ],
          "contentBoundsPx": [
            4,
            14,
            168,
            110
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.hold.ruin": {
      "variants": [
        {
          "id": "hold",
          "src": "places/hold@4x.png",
          "sourceSize": [
            176,
            132
          ],
          "logicalSize": [
            44,
            33
          ],
          "anchorPx": [
            88.0,
            124
          ],
          "contentBoundsPx": [
            4,
            14,
            168,
            110
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.glade.burned": {
      "variants": [
        {
          "id": "glade",
          "src": "places/glade@4x.png",
          "sourceSize": [
            172,
            172
          ],
          "logicalSize": [
            43,
            43
          ],
          "anchorPx": [
            86.0,
            164
          ],
          "contentBoundsPx": [
            4,
            31,
            164,
            133
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.glade.ruin": {
      "variants": [
        {
          "id": "glade",
          "src": "places/glade@4x.png",
          "sourceSize": [
            172,
            172
          ],
          "logicalSize": [
            43,
            43
          ],
          "anchorPx": [
            86.0,
            164
          ],
          "contentBoundsPx": [
            4,
            31,
            164,
            133
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.monastery.burned": {
      "variants": [
        {
          "id": "monastery",
          "src": "places/monastery@4x.png",
          "sourceSize": [
            128,
            124
          ],
          "logicalSize": [
            32,
            31
          ],
          "anchorPx": [
            64.0,
            116
          ],
          "contentBoundsPx": [
            4,
            47,
            120,
            69
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.monastery.ruin": {
      "variants": [
        {
          "id": "monastery",
          "src": "places/monastery@4x.png",
          "sourceSize": [
            128,
            124
          ],
          "logicalSize": [
            32,
            31
          ],
          "anchorPx": [
            64.0,
            116
          ],
          "contentBoundsPx": [
            4,
            47,
            120,
            69
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.shrine.burned": {
      "variants": [
        {
          "id": "shrine",
          "src": "places/shrine@4x.png",
          "sourceSize": [
            76,
            88
          ],
          "logicalSize": [
            19,
            22
          ],
          "anchorPx": [
            38.0,
            80
          ],
          "contentBoundsPx": [
            10,
            4,
            56,
            76
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.shrine.ruin": {
      "variants": [
        {
          "id": "shrine",
          "src": "places/shrine@4x.png",
          "sourceSize": [
            76,
            88
          ],
          "logicalSize": [
            19,
            22
          ],
          "anchorPx": [
            38.0,
            80
          ],
          "contentBoundsPx": [
            10,
            4,
            56,
            76
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.warren.burned": {
      "variants": [
        {
          "id": "warren",
          "src": "places/warren@4x.png",
          "sourceSize": [
            124,
            88
          ],
          "logicalSize": [
            31,
            22
          ],
          "anchorPx": [
            62.0,
            80
          ],
          "contentBoundsPx": [
            4,
            25,
            116,
            55
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.warren.ruin": {
      "variants": [
        {
          "id": "warren",
          "src": "places/warren@4x.png",
          "sourceSize": [
            124,
            88
          ],
          "logicalSize": [
            31,
            22
          ],
          "anchorPx": [
            62.0,
            80
          ],
          "contentBoundsPx": [
            4,
            25,
            116,
            55
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.tower.burned": {
      "variants": [
        {
          "id": "tower",
          "src": "places/tower@4x.png",
          "sourceSize": [
            72,
            184
          ],
          "logicalSize": [
            18,
            46
          ],
          "anchorPx": [
            36.0,
            176
          ],
          "contentBoundsPx": [
            4,
            9,
            64,
            167
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.tower.ruin": {
      "variants": [
        {
          "id": "tower",
          "src": "places/tower@4x.png",
          "sourceSize": [
            72,
            184
          ],
          "logicalSize": [
            18,
            46
          ],
          "anchorPx": [
            36.0,
            176
          ],
          "contentBoundsPx": [
            4,
            9,
            64,
            167
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.rivalLair.ruin": {
      "variants": [
        {
          "id": "rival-lair",
          "src": "places/rival-lair@4x.png",
          "sourceSize": [
            164,
            176
          ],
          "logicalSize": [
            41,
            44
          ],
          "anchorPx": [
            82.0,
            168
          ],
          "contentBoundsPx": [
            4,
            26,
            156,
            142
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.stronghold.warlord.ruin": {
      "variants": [
        {
          "id": "warlord",
          "src": "places/warlord@4x.png",
          "sourceSize": [
            204,
            128
          ],
          "logicalSize": [
            51,
            32
          ],
          "anchorPx": [
            102.0,
            120
          ],
          "contentBoundsPx": [
            15,
            4,
            174,
            116
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.stronghold.sorcerer.ruin": {
      "variants": [
        {
          "id": "sorcerer",
          "src": "places/sorcerer@4x.png",
          "sourceSize": [
            96,
            168
          ],
          "logicalSize": [
            24,
            42
          ],
          "anchorPx": [
            48.0,
            160
          ],
          "contentBoundsPx": [
            4,
            42,
            88,
            118
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.stronghold.blightmother.ruin": {
      "variants": [
        {
          "id": "blightmother",
          "src": "places/blightmother@4x.png",
          "sourceSize": [
            172,
            120
          ],
          "logicalSize": [
            43,
            30
          ],
          "anchorPx": [
            86.0,
            112
          ],
          "contentBoundsPx": [
            18,
            4,
            137,
            108
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.sanctuary.ruin": {
      "variants": [
        {
          "id": "sanctuary",
          "src": "places/sanctuary@4x.png",
          "sourceSize": [
            140,
            112
          ],
          "logicalSize": [
            35,
            28
          ],
          "anchorPx": [
            70.0,
            104
          ],
          "contentBoundsPx": [
            34,
            4,
            71,
            100
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "spent",
          "decor": "rubble"
        }
      ]
    },
    "map.place.city.great.burned": {
      "variants": [
        {
          "id": "city",
          "src": "places/city@4x.png",
          "sourceSize": [
            172,
            204
          ],
          "logicalSize": [
            49,
            57
          ],
          "anchorPx": [
            86.0,
            196
          ],
          "contentBoundsPx": [
            4,
            26,
            164,
            170
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true,
          "treatment": "burned",
          "decor": "rubble"
        }
      ]
    },
    "map.place.city.great.ruin": {
      "variants": [
        {
          "id": "city",
          "src": "places/city@4x.png",
          "sourceSize": [
            172,
            204
          ],
          "logicalSize": [
            49,
            57
          ],
          "anchorPx": [
            86.0,
            196
          ],
          "contentBoundsPx": [
            4,
            26,
            164,
            170
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "allowStretch": true,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.stronghold.ruin": {
      "variants": [
        {
          "id": "warlord",
          "src": "places/warlord@4x.png",
          "sourceSize": [
            204,
            128
          ],
          "logicalSize": [
            51,
            32
          ],
          "anchorPx": [
            102.0,
            120
          ],
          "contentBoundsPx": [
            15,
            4,
            174,
            116
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "treatment": "ruin",
          "decor": "rubble"
        }
      ]
    },
    "map.place.camp.bandit.burned": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "burned"
        }
      ]
    },
    "map.place.camp.bandit.ruin": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "ruin"
        }
      ]
    },
    "map.place.camp.goblin.burned": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "burned"
        }
      ]
    },
    "map.place.camp.goblin.ruin": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "ruin"
        }
      ]
    },
    "map.place.camp.hunter.burned": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "burned"
        }
      ]
    },
    "map.place.camp.hunter.ruin": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "ruin"
        }
      ]
    },
    "map.place.camp.military.burned": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "burned"
        }
      ]
    },
    "map.place.camp.military.ruin": {
      "variants": [
        {
          "id": "camp",
          "src": "places/camp@4x.png",
          "sourceSize": [
            140,
            84
          ],
          "logicalSize": [
            35,
            21
          ],
          "anchorPx": [
            70.0,
            76
          ],
          "contentBoundsPx": [
            4,
            18,
            132,
            58
          ],
          "sampling": "smooth",
          "allowFlipX": false,
          "decor": "rubble",
          "treatment": "ruin"
        }
      ]
    }
  },
  "version": "0.15.0",
  "description": "Complete illustrated map locations, home stages and moving pieces; native fine-ink details for dynamic signs, fog and terrain."
}, "illuminated");
