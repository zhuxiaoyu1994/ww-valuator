'use strict';
const CONFIG_VERSION = 0x3, CHAR_TIERS = {
        'S': {
            'price': 0x32,
            'isHot': !![],
            'chars': [
                '爱弥斯',
                '绯雪',
                '卡提希娅'
            ]
        },
        'A': {
            'price': 0x23,
            'isHot': !![],
            'chars': [
                '琳奈',
                '千咲',
                '穗穗',
                '莫宁',
                '秧秧玄翎',
                '弗洛洛',
                '洛瑟菈'
            ]
        },
        'B': {
            'price': 0x19,
            'isHot': !![],
            'chars': [
                '达妮娅',
                '夏空',
                '露西',
                '嘉贝莉娜',
                '奥古斯塔',
                '仇远',
                '尤诺',
                '陆赫斯',
                '赞妮',
                '布兰特',
                '守岸人',
                '西格莉卡'
            ]
        },
        'C': {
            'price': 0x5,
            'isHot': ![],
            'chars': [
                '露帕',
                '珂莱塔',
                '菲比',
                '坎特蕾拉',
                '椿'
            ]
        },
        'D': {
            'price': 0x3,
            'isHot': ![],
            'chars': [
                '忌炎',
                '吟霖',
                '相里要',
                '今汐',
                '长离',
                '折枝',
                '洛可可',
                '丽贝卡'
            ]
        },
        'E': {
            'price': 0x2,
            'isHot': ![],
            'chars': [
                '维里奈',
                '卡卡罗',
                '安可',
                '凌阳',
                '鉴心',
                '秧秧'
            ]
        }
    }, SIG_WEAPONS = {
        '忌炎': '苍鳞千嶂',
        '吟霖': '掣傀之手',
        '今汐': '时和岁稔',
        '长离': '赫奕流明',
        '相里要': '诸方玄枢',
        '椿': '裁春',
        '珂莱塔': '死与舞',
        '折枝': '琼枝冰绡',
        '守岸人': '星序协响',
        '洛瑟菈': '存帧',
        '莫宁': '宙算仪轨',
        '千咲': '昙切',
        '爱弥斯': '永远的启明星',
        '弗洛洛': '幽冥的忘忧章',
        '卡提希娅': '不屈命定之冠',
        '尤诺': '万物持存的注释',
        '夏空': '林间的咏叹调',
        '赞妮': '焰光裁定',
        '坎特蕾拉': '海的呢喃',
        '仇远': '裁竹',
        '布兰特': '不灭航路',
        '露帕': '焰痕',
        '奥古斯塔': '驭冕铸雷之权',
        '嘉贝莉娜': '光影双生',
        '西格莉卡': '昭日译注',
        '达妮娅': '赝作的矮星',
        '菲比': '和光回唱',
        '绯雪': '灼霜',
        '琳奈': '溢彩荧辉',
        '丽贝卡': '碎骨',
        '陆赫斯': '白昼之脊',
        '秧秧玄翎': '天之苍苍',
        '穗穗': '栖霞饮露',
        '露西': '蜃影'
    }, FULL_CONST_WEIGHT = {
        'S': 0x1,
        'A': 0.6,
        'B': 0.3,
        'C': 0.2,
        'D': 0.1,
        'E': 0x0
    }, DEFAULT_WEIGHTS = {
        'fiveStarWeapon': 0x0,
        'weaponRefineBonus': 0x2,
        'hotC0Mult': 0x1,
        'hotC3Mult': 0x2,
        'hotC6Mult': 0x3,
        'hotStepMult': 0.08,
        'hotNoSigMult': 0.5,
        'hotNoSigC6Mult': 0.5,
        'coldStep': 0x0,
        'coldC3Bonus': 0x0,
        'coldC6Bonus': 0x0,
        'coldSigBonus': 0x0,
        'c6TierWeights': {
            'S': 0x1,
            'A': 0.6,
            'B': 0.3,
            'C': 0.2,
            'D': 0.1,
            'E': 0x0
        },
        'c6MultiBonus': [
            {
                'count': 0x2,
                'bonus': 0.5
            },
            {
                'count': 0x3,
                'bonus': 0x1
            },
            {
                'count': 0x4,
                'bonus': 1.5
            },
            {
                'count': 0x5,
                'bonus': 0x2
            },
            {
                'count': 0x6,
                'bonus': 2.5
            },
            {
                'count': 0x7,
                'bonus': 0x3
            },
            {
                'count': 0x8,
                'bonus': 3.5
            },
            {
                'count': 0x9,
                'bonus': 0x4
            },
            {
                'count': 0xa,
                'bonus': 4.5
            }
        ],
        'outfit': 0x2,
        'motoAccessory': 0x0,
        'motoFrame': 0xa,
        'paint': 0x0,
        'pullC6Bonus': [
            {
                'count': 0x1,
                'bonus': 0.15
            },
            {
                'count': 0x2,
                'bonus': 0.25
            },
            {
                'count': 0x3,
                'bonus': 0.35
            },
            {
                'count': 0x4,
                'bonus': 0.45
            },
            {
                'count': 0x5,
                'bonus': 0.5
            },
            {
                'count': 0x6,
                'bonus': 0.55
            },
            {
                'count': 0x7,
                'bonus': 0.6
            },
            {
                'count': 0x8,
                'bonus': 0.65
            },
            {
                'count': 0x9,
                'bonus': 0.7
            },
            {
                'count': 0xa,
                'bonus': 0.75
            },
            {
                'count': 0xb,
                'bonus': 0.8
            },
            {
                'count': 0xc,
                'bonus': 0.85
            },
            {
                'count': 0xd,
                'bonus': 0.9
            },
            {
                'count': 0xe,
                'bonus': 0.95
            },
            {
                'count': 0xf,
                'bonus': 0x1
            }
        ],
        'teamMultiBonus': [
            {
                'count': 0x2,
                'coef': 1.05
            },
            {
                'count': 0x3,
                'coef': 1.1
            },
            {
                'count': 0x4,
                'coef': 1.15
            },
            {
                'count': 0x5,
                'coef': 1.2
            },
            {
                'count': 0x6,
                'coef': 1.25
            },
            {
                'count': 0x7,
                'coef': 1.3
            },
            {
                'count': 0x8,
                'coef': 1.35
            },
            {
                'count': 0x9,
                'coef': 1.4
            },
            {
                'count': 0xa,
                'coef': 1.45
            }
        ],
        'flatDiscountRules': [{
                'chars': [
                    '爱弥斯',
                    '绯雪',
                    '卡提希娅'
                ],
                'maxConst': 0x3,
                'discount': 0.9
            }]
    }, DEFAULT_TEAMS = [
        {
            'name': '绯洛千',
            'members': [
                '绯雪',
                '洛瑟菈',
                '千咲'
            ],
            'multiplier': 1.5
        },
        {
            'name': '日月守',
            'members': [
                '奥古斯塔',
                '尤诺',
                '守岸人'
            ],
            'multiplier': 1.2
        },
        {
            'name': '弗坎守',
            'members': [
                '弗洛洛',
                '坎特蕾拉',
                '守岸人'
            ],
            'multiplier': 1.2
        },
        {
            'name': '爱达千',
            'members': [
                '爱弥斯',
                '达妮娅',
                '千咲'
            ],
            'multiplier': 1.2
        },
        {
            'name': '卡夏千',
            'members': [
                '卡提希娅',
                '夏空',
                '千咲'
            ],
            'multiplier': 1.2
        },
        {
            'name': '露丽守',
            'members': [
                '露西',
                '丽贝卡',
                '守岸人'
            ],
            'multiplier': 1.2
        },
        {
            'name': '西仇守',
            'members': [
                '西格莉卡',
                '仇远',
                '守岸人'
            ],
            'multiplier': 1.2
        },
        {
            'name': '嘉仇守',
            'members': [
                '嘉贝莉娜',
                '仇远',
                '守岸人'
            ],
            'multiplier': 1.2
        },
        {
            'name': '爱琳莫',
            'members': [
                '爱弥斯',
                '莫宁',
                '琳奈'
            ],
            'multiplier': 1.5
        },
        {
            'name': '三火队',
            'members': [
                '布兰特',
                '露帕',
                '长离'
            ],
            'multiplier': 1.1
        },
        {
            'name': '赞菲守',
            'members': [
                '赞妮',
                '菲比',
                '守岸人'
            ],
            'multiplier': 1.1
        }
    ], DEFAULT_PULL_TIERS = [
        {
            'minPull': 0x0,
            'maxPull': 0x64,
            'perPullPrice': 0.7
        },
        {
            'minPull': 0x64,
            'maxPull': 0xc8,
            'perPullPrice': 0.9
        },
        {
            'minPull': 0xc8,
            'maxPull': 0x12c,
            'perPullPrice': 1.1
        },
        {
            'minPull': 0x12c,
            'maxPull': 0x190,
            'perPullPrice': 1.3
        },
        {
            'minPull': 0x190,
            'maxPull': 0x1f4,
            'perPullPrice': 1.5
        },
        {
            'minPull': 0x1f4,
            'maxPull': 0x258,
            'perPullPrice': 1.8
        },
        {
            'minPull': 0x258,
            'maxPull': 0x2bc,
            'perPullPrice': 0x2
        },
        {
            'minPull': 0x2bc,
            'maxPull': 0x320,
            'perPullPrice': 2.2
        },
        {
            'minPull': 0x320,
            'maxPull': 0x384,
            'perPullPrice': 2.4
        },
        {
            'minPull': 0x384,
            'maxPull': 0x3e8,
            'perPullPrice': 2.6
        },
        {
            'minPull': 0x3e8,
            'maxPull': 0x44c,
            'perPullPrice': 2.8
        },
        {
            'minPull': 0x44c,
            'maxPull': 0x4b0,
            'perPullPrice': 0x3
        },
        {
            'minPull': 0x4b0,
            'maxPull': 0x514,
            'perPullPrice': 3.2
        },
        {
            'minPull': 0x514,
            'maxPull': 0x578,
            'perPullPrice': 3.5
        },
        {
            'minPull': 0x578,
            'maxPull': 0x270f,
            'perPullPrice': 3.7
        }
    ], DEFAULT_YELLOW_TIERS = [
        {
            'minYellow': 0x0,
            'maxYellow': 0xa,
            'coefficient': 0.5
        },
        {
            'minYellow': 0xa,
            'maxYellow': 0x14,
            'coefficient': 0.6
        },
        {
            'minYellow': 0x14,
            'maxYellow': 0x1e,
            'coefficient': 0.7
        },
        {
            'minYellow': 0x1e,
            'maxYellow': 0x28,
            'coefficient': 0.8
        },
        {
            'minYellow': 0x28,
            'maxYellow': 0x32,
            'coefficient': 0.9
        },
        {
            'minYellow': 0x32,
            'maxYellow': 0x3c,
            'coefficient': 0x1
        },
        {
            'minYellow': 0x3c,
            'maxYellow': 0x46,
            'coefficient': 1.05
        },
        {
            'minYellow': 0x46,
            'maxYellow': 0x50,
            'coefficient': 1.1
        },
        {
            'minYellow': 0x50,
            'maxYellow': 0x5a,
            'coefficient': 1.15
        },
        {
            'minYellow': 0x5a,
            'maxYellow': 0x64,
            'coefficient': 1.2
        },
        {
            'minYellow': 0x64,
            'maxYellow': 0x6e,
            'coefficient': 1.25
        },
        {
            'minYellow': 0x6e,
            'maxYellow': 0x78,
            'coefficient': 1.3
        },
        {
            'minYellow': 0x78,
            'maxYellow': 0x3e7,
            'coefficient': 1.35
        }
    ], DEFAULT_CHAR_PRICES = {
        '爱弥斯': 0x32,
        '绯雪': 0x3c,
        '卡提希娅': 0x23,
        '弗洛洛': 0x23,
        '琳奈': 0x19,
        '守岸人': 0x14,
        '千咲': 0x19,
        '穗穗': 0x23,
        '莫宁': 0x19,
        '秧秧玄翎': 0x23,
        '洛瑟菈': 0x19,
        '达妮娅': 0xf,
        '夏空': 0xf,
        '露西': 0x14,
        '嘉贝莉娜': 0x12,
        '奥古斯塔': 0x12,
        '仇远': 0xf,
        '尤诺': 0xf,
        '陆赫斯': 0x14,
        '赞妮': 0x12,
        '布兰特': 0xf,
        '西格莉卡': 0x14,
        '露帕': 0xa,
        '珂莱塔': 0xa,
        '菲比': 0xa,
        '坎特蕾拉': 0xa,
        '椿': 0xa,
        '忌炎': 0x2,
        '吟霖': 0x2,
        '相里要': 0x2,
        '今汐': 0x2,
        '长离': 0x2,
        '折枝': 0x2,
        '洛可可': 0x2,
        '丽贝卡': 0x2,
        '维里奈': 0x0,
        '卡卡罗': 0x0,
        '安可': 0x0,
        '凌阳': 0x0,
        '鉴心': 0x0,
        '秧秧': 0x0
    }, DEFAULT_CONST_PREMIUMS = {
        '爱弥斯': {
            '3': 0x32,
            '6': 0xb4
        },
        '绯雪': {
            '2': 0x23,
            '3': 0x3c,
            '6': 0xc8
        },
        '卡提希娅': {
            '2': 0x14,
            '3': 0x23,
            '6': 0x78
        },
        '弗洛洛': {
            '2': 0x14,
            '6': 0x64
        },
        '奥古斯塔': {
            '2': 0x14,
            '6': 0x64
        },
        '尤诺': {
            '2': 0x14,
            '6': 0x3c
        },
        '露西': {
            '3': 0x1e,
            '6': 0x64
        },
        '忌炎': { '6': 0x1e },
        '守岸人': {
            '2': 0x14,
            '6': 0x32
        },
        '赞妮': {
            '2': 0x14,
            '6': 0x64
        },
        '椿': { '6': 0x32 },
        '莫宁': {
            '1': 0x14,
            '6': 0x64
        },
        '珂莱塔': { '6': 0x32 },
        '秧秧玄翎': {
            '3': 0x32,
            '6': 0xa0
        },
        '千咲': {
            '3': 0x32,
            '6': 0x64
        },
        '嘉贝莉娜': {
            '3': 0x1e,
            '6': 0x64
        },
        '陆赫斯': { '6': 0x64 },
        '西格莉卡': { '6': 0x64 },
        '丽贝卡': {
            '3': 0x14,
            '6': 0x32
        },
        '仇远': {
            '3': 0x1e,
            '6': 0x32
        },
        '今汐': { '6': 0x1e },
        '吟霖': { '6': 0x1e },
        '坎特蕾拉': {
            '2': 0x1e,
            '6': 0x32
        },
        '夏空': {
            '2': 0x14,
            '3': 0x1e,
            '6': 0x32
        },
        '布兰特': { '6': 0x50 },
        '长离': { '6': 0x1e },
        '相里要': { '6': 0x1e },
        '洛可可': { '6': 0x1e },
        '琳奈': { '6': 0x50 },
        '洛瑟菈': { '6': 0x50 },
        '折枝': { '6': 0x14 },
        '菲比': {
            '2': 0x1e,
            '6': 0x50
        },
        '露帕': { '6': 0x50 },
        '达妮娅': {
            '2': 0x1e,
            '6': 0x50
        }
    }, DEFAULT_NEED_SIG_WEAPONS = [
        '爱弥斯',
        '绯雪',
        '卡提希娅',
        '千咲',
        '今汐',
        '椿',
        '忌炎',
        '嘉贝莉娜',
        '弗洛洛',
        '珂莱塔',
        '西格莉卡',
        '赞妮',
        '陆赫斯'
    ], CHAR_ALIASES = { '爱弥丝': '爱弥斯' }, CHAR_LOOKUP = {};
for (const [tier, info] of Object['entries'](CHAR_TIERS)) {
    for (const name of info['chars']) {
        CHAR_LOOKUP[name] = {
            'tier': tier,
            'price': info['price'],
            'isHot': info['isHot']
        };
    }
}
for (const [alias, canonical] of Object['entries'](CHAR_ALIASES)) {
    CHAR_LOOKUP[canonical] && (CHAR_LOOKUP[alias] = CHAR_LOOKUP[canonical]);
}
const SECTION_KEYWORDS = [
    '五星角色',
    '四星角色',
    '五星武器',
    '金色武器',
    '地图探索度',
    '余波珊瑚',
    '残振珊瑚',
    '浮金波纹',
    '铸潮波纹',
    '唤声涡纹',
    '摩托饰品',
    '车架模组',
    '星声',
    '月相',
    '服饰',
    '皮肤',
    '摩托',
    '车架',
    '涂装',
    '数据坞等级',
    '联觉等级'
];
function buildDefaultCharPrices() {
    const _0x7e7878 = {};
    for (const _0x4efa56 of Object['keys'](CHAR_TIERS)) {
        for (const _0x2da14b of CHAR_TIERS[_0x4efa56]['chars']) {
            _0x7e7878[_0x2da14b] = DEFAULT_CHAR_PRICES[_0x2da14b] != null ? DEFAULT_CHAR_PRICES[_0x2da14b] : CHAR_TIERS[_0x4efa56]['price'];
        }
    }
    return _0x7e7878;
}
function buildDefaultTeamPremiums() {
    const _0x414d70 = {};
    for (const _0x226d63 of DEFAULT_TEAMS) {
        _0x414d70[_0x226d63['name']] = {
            'chars': [..._0x226d63['members'] || []],
            'multiplier': _0x226d63['multiplier'] || 0x1,
            'enabled': !![]
        };
    }
    return _0x414d70;
}
function buildDefaultWeights(_0x259f05) {
    const _0x58b3ec = _0x259f05 || {}, _0x351aa2 = Object['assign']({}, DEFAULT_WEIGHTS, _0x58b3ec);
    _0x351aa2['c6TierWeights'] = Object['assign']({}, DEFAULT_WEIGHTS['c6TierWeights'], _0x58b3ec['c6TierWeights'] || {}), _0x351aa2['c6MultiBonus'] = _0x58b3ec['c6MultiBonus'] && _0x58b3ec['c6MultiBonus']['length'] ? _0x58b3ec['c6MultiBonus'] : DEFAULT_WEIGHTS['c6MultiBonus'], _0x351aa2['pullC6Bonus'] = _0x58b3ec['pullC6Bonus'] && _0x58b3ec['pullC6Bonus']['length'] ? _0x58b3ec['pullC6Bonus'] : DEFAULT_WEIGHTS['pullC6Bonus'], _0x351aa2['teamMultiBonus'] = _0x58b3ec['teamMultiBonus'] && _0x58b3ec['teamMultiBonus']['length'] ? _0x58b3ec['teamMultiBonus'] : DEFAULT_WEIGHTS['teamMultiBonus'], _0x351aa2['flatDiscountRules'] = _0x58b3ec['flatDiscountRules'] && _0x58b3ec['flatDiscountRules']['length'] ? _0x58b3ec['flatDiscountRules'] : DEFAULT_WEIGHTS['flatDiscountRules'], _0x351aa2['pullTiers'] = _0x58b3ec['pullTiers'] && _0x58b3ec['pullTiers']['length'] ? _0x58b3ec['pullTiers'] : DEFAULT_PULL_TIERS, _0x351aa2['yellowTiers'] = _0x58b3ec['yellowTiers'] && _0x58b3ec['yellowTiers']['length'] ? _0x58b3ec['yellowTiers'] : DEFAULT_YELLOW_TIERS, _0x351aa2['charPrices'] = Object['assign']({}, buildDefaultCharPrices(), _0x58b3ec['charPrices'] || {}), _0x351aa2['constPremiums'] = Object['assign']({}, DEFAULT_CONST_PREMIUMS, _0x58b3ec['constPremiums'] || {}), _0x351aa2['teamPremiums'] = _0x58b3ec['teamPremiums'] || buildDefaultTeamPremiums(), _0x351aa2['teams'] = [];
    for (const _0x9aeb56 of Object['keys'](_0x351aa2['teamPremiums'])) {
        const _0x5a1bc9 = _0x351aa2['teamPremiums'][_0x9aeb56];
        _0x5a1bc9 && _0x5a1bc9['enabled'] !== ![] && _0x351aa2['teams']['push']({
            'name': _0x9aeb56,
            'members': _0x5a1bc9['chars'] || [],
            'multiplier': _0x5a1bc9['multiplier'] || 0x1
        });
    }
    return _0x351aa2['needSigWeapons'] = _0x58b3ec['needSigWeapons'] || DEFAULT_NEED_SIG_WEAPONS, _0x58b3ec['sigWeaponsOverride'] && (_0x351aa2['sigWeaponsOverride'] = _0x58b3ec['sigWeaponsOverride']), _0x351aa2;
}
const WEIGHT_LABELS = {
    'fiveStarWeapon': {
        'label': '五星武器(基础)',
        'desc': '每个五星武器基础价（元，精1）'
    },
    'weaponRefineBonus': {
        'label': '武器精炼加成',
        'desc': '每级精炼额外加价（元，精5=+4×此值）'
    },
    'hotC0Mult': {
        'label': '热门C0+专武倍率',
        'desc': 'C0+专武\x20=\x20基础价\x20×\x20此倍率（1.0=100%）'
    },
    'hotC3Mult': {
        'label': '热门C3+专武倍率',
        'desc': 'C3+专武\x20=\x20基础价\x20×\x20此倍率（2.0=200%，价值翻倍）'
    },
    'hotC6Mult': {
        'label': '热门C6+专武倍率',
        'desc': 'C6+专武\x20=\x20基础价\x20×\x20此倍率（3.0=300%，满命三倍）'
    },
    'hotStepMult': {
        'label': '热门过渡命倍率',
        'desc': 'C1/C2/C4/C5每命加成\x20=\x20基础价\x20×\x20此倍率（0.08=8%）'
    },
    'hotNoSigMult': {
        'label': '热门无专武倍率',
        'desc': '热门角色无专武\x20=\x20基础价\x20×\x20此倍率（0.15=仅值15%）'
    },
    'hotNoSigC6Mult': {
        'label': '热门C6无专武倍率',
        'desc': '满命但无专武\x20=\x20基础价\x20×\x20此倍率（0.25=25%）'
    },
    'coldStep': {
        'label': '冷门每命加分',
        'desc': '冷门角色每命加此值（元）'
    },
    'coldC3Bonus': {
        'label': '冷门C3加分',
        'desc': '冷门角色3命额外加此值（元）'
    },
    'coldC6Bonus': {
        'label': '冷门C6加分',
        'desc': '冷门角色满命额外加此值（元）'
    },
    'coldSigBonus': {
        'label': '冷门专武加分',
        'desc': '冷门角色有专武额外加此值（元）'
    },
    'outfit': {
        'label': '服饰/皮肤',
        'desc': '每个服饰/皮肤（元）'
    },
    'motoAccessory': {
        'label': '摩托饰品',
        'desc': '每个摩托饰品（元）'
    },
    'motoFrame': {
        'label': '车架模组',
        'desc': '每个车架模组（元）'
    },
    'paint': {
        'label': '涂装',
        'desc': '每个涂装（元）'
    }
};
function getDefaults() {
    return {
        'configVersion': CONFIG_VERSION,
        'weights': buildDefaultWeights(),
        'charTiers': CHAR_TIERS,
        'sigWeapons': SIG_WEAPONS,
        'constPremiums': DEFAULT_CONST_PREMIUMS,
        'teams': DEFAULT_TEAMS,
        'pullTiers': DEFAULT_PULL_TIERS,
        'yellowTiers': DEFAULT_YELLOW_TIERS,
        'charPrices': buildDefaultCharPrices(),
        'needSigWeapons': DEFAULT_NEED_SIG_WEAPONS,
        'weightLabels': WEIGHT_LABELS
    };
}
let weights = buildDefaultWeights(), _sigWeaponsOverride = null;
function extractSection(_0x294750, _0x53e59f) {
    const _0x5772dc = _0x53e59f['replace'](/[.*+?^${}()|[\]\\]/g, '\x5c$&'), _0x5518b1 = SECTION_KEYWORDS['filter'](_0x517013 => _0x517013 !== _0x53e59f)['map'](_0xb7351 => '【?' + _0xb7351['replace'](/[.*+?^${}()|[\]\\]/g, '\x5c$&') + '(?:[（(]\x5cd+[）)])?(?:[：:]|\x5cs*\x5cn|】)'), _0x36e8de = _0x5772dc + '[：:]\x5cs*([\x5cs\x5cS]*?)(?=' + _0x5518b1['join']('|') + '|$)', _0x55c7cb = _0x294750['match'](new RegExp(_0x36e8de));
    if (_0x55c7cb)
        return _0x55c7cb[0x1]['trim']();
    const _0x16a10b = _0x5772dc + '[（(]\x5cd+[）)]\x5cs*[：:]?\x5cs*\x5cn?\x5cs*([\x5cs\x5cS]*?)(?=' + _0x5518b1['join']('|') + '|$)', _0x49bc7e = _0x294750['match'](new RegExp(_0x16a10b));
    if (_0x49bc7e)
        return _0x49bc7e[0x1]['trim']();
    const _0xad5ddf = '【' + _0x5772dc + '】\x5cs*[：:]?\x5cs*([\x5cs\x5cS]*?)(?=' + _0x5518b1['join']('|') + '|$)', _0x16dc18 = _0x294750['match'](new RegExp(_0xad5ddf));
    if (_0x16dc18)
        return _0x16dc18[0x1]['trim']();
    return '';
}
function extractNumber(_0xf11ba8, _0x47f3c7) {
    const _0x4ab9e3 = _0x47f3c7['replace'](/[.*+?^${}()|[\]\\]/g, '\x5c$&'), _0x3e5f21 = _0xf11ba8['match'](new RegExp(_0x4ab9e3 + '[：:]\x5cs*(\x5cd[\x5cd,]*)', 'i'));
    if (_0x3e5f21)
        return parseInt(_0x3e5f21[0x1]['replace'](/,/g, ''));
    const _0x1d5876 = _0xf11ba8['match'](new RegExp('【' + _0x4ab9e3 + '】\x5cs*[：:]?\x5cs*(\x5cd[\x5cd,]*)', 'i'));
    if (_0x1d5876)
        return parseInt(_0x1d5876[0x1]['replace'](/,/g, ''));
    return 0x0;
}
function parseCharacters(_0x2afba4) {
    const _0x2658de = [];
    if (!_0x2afba4)
        return _0x2658de;
    const _0x44fd8e = _0x2afba4['split'](/[,，、\s;；]+/)['filter'](_0x98176f => _0x98176f['length'] > 0x0);
    for (const _0x2c219f of _0x44fd8e) {
        let _0x413da4 = 0x0, _0x499143 = '', _0x33dfe6 = _0x2c219f['match'](/^满命(.+)$/);
        _0x33dfe6 ? (_0x413da4 = 0x6, _0x499143 = _0x33dfe6[0x1]) : (_0x33dfe6 = _0x2c219f['match'](/^(\d+)命(.+)$/), _0x33dfe6 ? (_0x413da4 = parseInt(_0x33dfe6[0x1]), _0x499143 = _0x33dfe6[0x2]) : (_0x33dfe6 = _0x2c219f['match'](/^(.+?)\(满命\)$/), _0x33dfe6 ? (_0x499143 = _0x33dfe6[0x1], _0x413da4 = 0x6) : (_0x33dfe6 = _0x2c219f['match'](/^(.+?)\((\d+)命\)$/), _0x33dfe6 ? (_0x499143 = _0x33dfe6[0x1], _0x413da4 = parseInt(_0x33dfe6[0x2])) : (_0x499143 = _0x2c219f, _0x413da4 = 0x0))));
        const _0x931c19 = CHAR_ALIASES[_0x499143] || _0x499143, _0x547022 = CHAR_LOOKUP[_0x931c19];
        _0x547022 && _0x2658de['push']({
            'name': _0x931c19,
            'const': _0x413da4,
            'tier': _0x547022['tier'],
            'price': _0x547022['price'],
            'isHot': _0x547022['isHot']
        });
    }
    const _0x1de581 = {};
    for (const _0x465bca of _0x2658de) {
        (!_0x1de581[_0x465bca['name']] || _0x465bca['const'] > _0x1de581[_0x465bca['name']]['const']) && (_0x1de581[_0x465bca['name']] = _0x465bca);
    }
    return Object['values'](_0x1de581);
}
function findCharsInText(_0x51d5d8) {
    const _0x66a48e = [];
    for (const [_0x18a147, _0x5ed649] of Object['entries'](CHAR_TIERS)) {
        for (const _0x59f23a of _0x5ed649['chars']) {
            const _0x5ecaa4 = [_0x59f23a];
            for (const [_0x51e750, _0xdf7fc4] of Object['entries'](CHAR_ALIASES)) {
                if (_0xdf7fc4 === _0x59f23a)
                    _0x5ecaa4['push'](_0x51e750);
            }
            let _0x155afd = ![];
            for (const _0x45c821 of _0x5ecaa4) {
                if (_0x51d5d8['includes']('满命' + _0x45c821)) {
                    _0x66a48e['push']({
                        'name': _0x59f23a,
                        'const': 0x6,
                        'tier': _0x18a147,
                        'price': _0x5ed649['price'],
                        'isHot': _0x5ed649['isHot']
                    }), _0x155afd = !![];
                    break;
                }
                const _0x3405f3 = _0x51d5d8['match'](new RegExp('(\x5cd+)命' + _0x45c821));
                if (_0x3405f3) {
                    _0x66a48e['push']({
                        'name': _0x59f23a,
                        'const': parseInt(_0x3405f3[0x1]),
                        'tier': _0x18a147,
                        'price': _0x5ed649['price'],
                        'isHot': _0x5ed649['isHot']
                    }), _0x155afd = !![];
                    break;
                }
                if (_0x51d5d8['includes'](_0x45c821 + '(满命)')) {
                    _0x66a48e['push']({
                        'name': _0x59f23a,
                        'const': 0x6,
                        'tier': _0x18a147,
                        'price': _0x5ed649['price'],
                        'isHot': _0x5ed649['isHot']
                    }), _0x155afd = !![];
                    break;
                }
                const _0x25174a = _0x51d5d8['match'](new RegExp(_0x45c821 + '\x5c((\x5cd+)命\x5c)'));
                if (_0x25174a) {
                    _0x66a48e['push']({
                        'name': _0x59f23a,
                        'const': parseInt(_0x25174a[0x1]),
                        'tier': _0x18a147,
                        'price': _0x5ed649['price'],
                        'isHot': _0x5ed649['isHot']
                    }), _0x155afd = !![];
                    break;
                }
                if (_0x51d5d8['includes'](_0x45c821)) {
                    _0x66a48e['push']({
                        'name': _0x59f23a,
                        'const': 0x0,
                        'tier': _0x18a147,
                        'price': _0x5ed649['price'],
                        'isHot': _0x5ed649['isHot']
                    }), _0x155afd = !![];
                    break;
                }
            }
        }
    }
    const _0x4380cc = {};
    for (const _0x368da5 of _0x66a48e) {
        (!_0x4380cc[_0x368da5['name']] || _0x368da5['const'] > _0x4380cc[_0x368da5['name']]['const']) && (_0x4380cc[_0x368da5['name']] = _0x368da5);
    }
    return Object['values'](_0x4380cc);
}
function parseWeapons(_0x3f4e1d) {
    const _0x1e1c8b = [];
    if (!_0x3f4e1d)
        return _0x1e1c8b;
    const _0x318d59 = _0x3f4e1d['split'](/[,，、\s;；]+/)['filter'](_0x477646 => _0x477646['length'] > 0x0);
    for (const _0x3ff1e2 of _0x318d59) {
        let _0x5a6735 = 0x1, _0x3f5772 = '';
        const _0x56801e = _0x3ff1e2['match'](/^精(\d+)(.+)$/);
        _0x56801e ? (_0x5a6735 = parseInt(_0x56801e[0x1]), _0x3f5772 = _0x56801e[0x2]) : (_0x3f5772 = _0x3ff1e2, _0x5a6735 = 0x1);
        if (_0x3f5772)
            _0x1e1c8b['push']({
                'name': _0x3f5772,
                'refine': _0x5a6735
            });
    }
    return _0x1e1c8b;
}
function extractYellowCount(_0x29b629) {
    let _0x3709b3 = _0x29b629['match'](/(\d+)\s*黄/);
    if (_0x3709b3)
        return parseInt(_0x3709b3[0x1]);
    _0x3709b3 = _0x29b629['match'](/黄[数]?[：:]\s*(\d+)/);
    if (_0x3709b3)
        return parseInt(_0x3709b3[0x1]);
    _0x3709b3 = _0x29b629['match'](/【黄[数]?】\s*[：:]?\s*(\d+)/);
    if (_0x3709b3)
        return parseInt(_0x3709b3[0x1]);
    return 0x0;
}
function extractListCount(_0x2e4767, _0x133a15) {
    const _0x2cbeaf = extractSection(_0x2e4767, _0x133a15);
    if (!_0x2cbeaf)
        return 0x0;
    const _0x373aae = _0x2cbeaf['split'](/[,，、\s]+/)['filter'](_0x2a0bb8 => _0x2a0bb8['length'] > 0x0);
    return _0x373aae['length'];
}
function extractListItems(_0x52942c, _0x5bd1a2) {
    const _0x18850b = extractSection(_0x52942c, _0x5bd1a2);
    if (!_0x18850b)
        return [];
    return _0x18850b['split'](/[,，、\s]+/)['filter'](_0x25fc36 => _0x25fc36['length'] > 0x0);
}
function parseAccountInfo(_0x4d065c) {
    const _0x425fef = {
        'characters': [],
        'weapons': [],
        'starSound': 0x0,
        'moonPhase': 0x0,
        'aftermathCoral': 0x0,
        'floatGoldRipple': 0x0,
        'castTideRipple': 0x0,
        'yellowCount': 0x0,
        'outfitCount': 0x0,
        'motoCount': 0x0,
        'vehicleFrameCount': 0x0,
        'paintCount': 0x0,
        'pulls': 0x0,
        'rawText': _0x4d065c || ''
    };
    if (!_0x4d065c)
        return _0x425fef;
    const _0x243de3 = extractSection(_0x4d065c, '五星角色');
    _0x243de3 && (_0x425fef['characters'] = parseCharacters(_0x243de3));
    _0x425fef['characters']['length'] === 0x0 && (_0x425fef['characters'] = findCharsInText(_0x4d065c));
    let _0x2ff098 = extractSection(_0x4d065c, '五星武器');
    _0x2ff098 && (_0x425fef['weapons'] = parseWeapons(_0x2ff098));
    _0x425fef['weapons']['length'] === 0x0 && (_0x2ff098 = extractSection(_0x4d065c, '武器'), _0x2ff098 && (_0x425fef['weapons'] = parseWeapons(_0x2ff098)));
    _0x425fef['weapons']['length'] === 0x0 && (_0x2ff098 = extractSection(_0x4d065c, '金色武器'), _0x2ff098 && (_0x425fef['weapons'] = parseWeapons(_0x2ff098)));
    _0x425fef['starSound'] = extractNumber(_0x4d065c, '星声'), _0x425fef['moonPhase'] = extractNumber(_0x4d065c, '月相'), _0x425fef['aftermathCoral'] = extractNumber(_0x4d065c, '余波珊瑚'), _0x425fef['floatGoldRipple'] = extractNumber(_0x4d065c, '浮金波纹'), _0x425fef['castTideRipple'] = extractNumber(_0x4d065c, '铸潮波纹'), _0x425fef['yellowCount'] = extractYellowCount(_0x4d065c), _0x425fef['outfitCount'] = extractListCount(_0x4d065c, '服饰');
    if (_0x425fef['outfitCount'] === 0x0) {
        const _0x1adc71 = extractSection(_0x4d065c, '皮肤');
        if (_0x1adc71) {
            const _0x4ad602 = parseInt(_0x1adc71);
            _0x425fef['outfitCount'] = isNaN(_0x4ad602) ? extractListCount(_0x4d065c, '皮肤') : _0x4ad602;
        }
    }
    return _0x425fef['motoCount'] = extractListCount(_0x4d065c, '车架模组') + extractListCount(_0x4d065c, '车架') + extractListCount(_0x4d065c, '摩托'), _0x425fef['motoAccessoryCount'] = extractListCount(_0x4d065c, '摩托饰品'), _0x425fef['vehicleFrameCount'] = extractListCount(_0x4d065c, '车架模组') + extractListCount(_0x4d065c, '车架'), _0x425fef['paintCount'] = extractListCount(_0x4d065c, '涂装'), _0x425fef['pulls'] = _0x425fef['starSound'] / 0xa0 + _0x425fef['moonPhase'] / 0xa0 + _0x425fef['aftermathCoral'] / 0x8 + _0x425fef['floatGoldRipple'] + _0x425fef['castTideRipple'], _0x425fef;
}
function checkHasSigWeapon(_0x31fe78, _0x1ddff0, _0x409eb5) {
    const _0x3e7c3e = _sigWeaponsOverride ? _sigWeaponsOverride[_0x31fe78] || SIG_WEAPONS[_0x31fe78] : SIG_WEAPONS[_0x31fe78];
    if (!_0x3e7c3e)
        return ![];
    if (_0x1ddff0 && _0x1ddff0['some'](_0x35dbcd => _0x35dbcd === _0x3e7c3e || _0x35dbcd['includes'](_0x3e7c3e) || _0x3e7c3e['includes'](_0x35dbcd)))
        return !![];
    if (_0x409eb5 && _0x409eb5['includes'](_0x3e7c3e))
        return !![];
    return ![];
}
function calcConstPremium(_0x2f718f, _0x3a1b49, _0x165c1d) {
    _0x165c1d = _0x165c1d || weights || DEFAULT_WEIGHTS;
    const _0x32a537 = _0x165c1d['constPremiums'] || {}, _0x4731d5 = _0x32a537[_0x2f718f];
    if (!_0x4731d5 || _0x3a1b49 <= 0x0)
        return 0x0;
    let _0x450499 = 0x0;
    for (const _0x1c14f9 of Object['keys'](_0x4731d5)) {
        const _0x2d4931 = parseInt(_0x1c14f9);
        if (!isNaN(_0x2d4931) && _0x3a1b49 >= _0x2d4931) {
            const _0x4ecc1a = _0x4731d5[_0x1c14f9] || 0x0;
            if (_0x4ecc1a > _0x450499)
                _0x450499 = _0x4ecc1a;
        }
    }
    return _0x450499;
}
function getCharValue(_0xcbb484, _0x20a2f3, _0x3545a3) {
    _0x3545a3 = _0x3545a3 || weights || DEFAULT_WEIGHTS;
    const _0x34e5c8 = _0x3545a3['charPrices'] || {}, _0x4cf8b2 = _0x34e5c8[_0xcbb484['name']] != null ? _0x34e5c8[_0xcbb484['name']] : _0xcbb484['price'];
    if (_0xcbb484['isHot']) {
        const _0x40bf90 = _0x3545a3['hotC0Mult'] != null ? _0x3545a3['hotC0Mult'] : 0x1, _0xc180b1 = _0x3545a3['hotC3Mult'] != null ? _0x3545a3['hotC3Mult'] : 0x2, _0x4944dc = _0x3545a3['hotC6Mult'] != null ? _0x3545a3['hotC6Mult'] : 0x3, _0x2088a3 = _0x3545a3['hotStepMult'] != null ? _0x3545a3['hotStepMult'] : 0.08, _0x361d4e = _0x3545a3['hotNoSigMult'] != null ? _0x3545a3['hotNoSigMult'] : 0.15, _0x302de2 = _0x3545a3['hotNoSigC6Mult'] != null ? _0x3545a3['hotNoSigC6Mult'] : 0.25;
        if (!_0x20a2f3) {
            if (_0xcbb484['const'] >= 0x6)
                return _0x4cf8b2 * _0x302de2;
            return _0x4cf8b2 * _0x361d4e;
        }
        if (_0xcbb484['const'] >= 0x6)
            return _0x4cf8b2 * _0x4944dc;
        if (_0xcbb484['const'] >= 0x3)
            return _0x4cf8b2 * _0xc180b1;
        if (_0xcbb484['const'] >= 0x1)
            return _0x4cf8b2 * (_0x40bf90 + _0xcbb484['const'] * _0x2088a3);
        return _0x4cf8b2 * _0x40bf90;
    } else {
        const _0x2c9964 = _0x3545a3['coldStep'] != null ? _0x3545a3['coldStep'] : 0x1, _0x5e6f62 = _0x3545a3['coldC3Bonus'] != null ? _0x3545a3['coldC3Bonus'] : 0x3, _0x3409c3 = _0x3545a3['coldC6Bonus'] != null ? _0x3545a3['coldC6Bonus'] : 0x5, _0x1b7b50 = _0x3545a3['coldSigBonus'] != null ? _0x3545a3['coldSigBonus'] : 0x2;
        let _0x246b65 = _0x4cf8b2 + _0xcbb484['const'] * _0x2c9964;
        if (_0xcbb484['const'] >= 0x3)
            _0x246b65 += _0x5e6f62;
        if (_0xcbb484['const'] >= 0x6)
            _0x246b65 += _0x3409c3;
        if (_0x20a2f3)
            _0x246b65 += _0x1b7b50;
        return _0x246b65;
    }
}
function calculatePullValue(_0xa9e856) {
    const _0x5874c2 = weights && weights['pullTiers'] || DEFAULT_PULL_TIERS, _0x3284b3 = {};
    for (const _0xc63c9 of _0x5874c2) {
        const _0x25d298 = (_0xc63c9['minPull'] || 0x0) + '-' + (_0xc63c9['maxPull'] == null ? 'inf' : _0xc63c9['maxPull']);
        _0x3284b3[_0x25d298] = _0xc63c9;
    }
    const _0x3b8059 = Object['values'](_0x3284b3), _0x4ccc82 = [..._0x3b8059]['sort']((_0x505cf1, _0x418e53) => (_0x505cf1['minPull'] || 0x0) - (_0x418e53['minPull'] || 0x0));
    let _0x312983 = _0x4ccc82[0x0] || {
        'minPull': 0x0,
        'maxPull': Infinity,
        'perPullPrice': 0.8
    };
    for (const _0xc1ae8c of _0x4ccc82) {
        const _0x29e802 = _0xc1ae8c['minPull'] != null ? _0xc1ae8c['minPull'] : 0x0, _0xf83712 = _0xc1ae8c['maxPull'] == null || _0xc1ae8c['maxPull'] === Infinity ? Infinity : _0xc1ae8c['maxPull'];
        if (_0xa9e856 >= _0x29e802 && _0xa9e856 < _0xf83712) {
            _0x312983 = {
                ..._0xc1ae8c,
                'minPull': _0x29e802,
                'maxPull': _0xf83712
            };
            break;
        }
    }
    const _0x3f0823 = _0xa9e856 * _0x312983['perPullPrice'], _0x43dcde = _0x312983['maxPull'] == null || _0x312983['maxPull'] === Infinity ? Infinity : _0x312983['maxPull'], _0x344d50 = _0x43dcde === Infinity ? _0x312983['minPull'] + '抽+' : _0x312983['minPull'] + '~' + _0x43dcde + '抽';
    return {
        'pulls': Math['round'](_0xa9e856),
        'perPull': _0x312983['perPullPrice'],
        'tierLabel': _0x344d50,
        'total': Math['round'](_0x3f0823)
    };
}
function getYellowCoeff(_0x5a3717) {
    const _0x2d33f4 = weights && weights['yellowTiers'] || DEFAULT_YELLOW_TIERS, _0x1b7b3d = {};
    for (const _0x48e0a2 of _0x2d33f4) {
        const _0x470fea = (_0x48e0a2['minYellow'] || 0x0) + '-' + (_0x48e0a2['maxYellow'] == null ? 'inf' : _0x48e0a2['maxYellow']);
        _0x1b7b3d[_0x470fea] = _0x48e0a2;
    }
    const _0x57c383 = Object['values'](_0x1b7b3d);
    let _0x3bb599 = _0x57c383[0x0] || {
        'minYellow': 0x0,
        'maxYellow': Infinity,
        'coefficient': 0.3
    };
    for (const _0x2593cb of _0x57c383) {
        const _0x330702 = _0x2593cb['maxYellow'] == null || _0x2593cb['maxYellow'] === Infinity ? Infinity : _0x2593cb['maxYellow'];
        if (_0x5a3717 >= _0x2593cb['minYellow'] && _0x5a3717 < _0x330702) {
            _0x3bb599 = {
                ..._0x2593cb,
                'maxYellow': _0x330702
            };
            break;
        }
    }
    const _0x5ba8c1 = _0x3bb599['maxYellow'] === Infinity ? _0x3bb599['minYellow'] + '黄+' : _0x3bb599['minYellow'] + '~' + _0x3bb599['maxYellow'] + '黄';
    return {
        'yellowCount': _0x5a3717,
        'coefficient': _0x3bb599['coefficient'],
        'tierLabel': _0x5ba8c1
    };
}
function calculateValue(_0x1b42e7, _0x3b19a1) {
    const _0x31bda6 = weights || DEFAULT_WEIGHTS, _0x460e9b = _0x1b42e7['weapons']['map'](_0x2d086e => _0x2d086e['name']), _0x2bf760 = _0x1b42e7['rawText'] || '', _0x511d16 = _0x31bda6['c6TierWeights'] || FULL_CONST_WEIGHT;
    let _0x5e0ccc = 0x0, _0x1350f6 = 0x0;
    const _0x147094 = [], _0x2f4b5e = [], _0x1f43a8 = [];
    for (const _0x26e30e of _0x1b42e7['characters']) {
        const _0x1d1f85 = checkHasSigWeapon(_0x26e30e['name'], _0x460e9b, _0x2bf760), _0x2e2932 = getCharValue(_0x26e30e, _0x1d1f85, _0x31bda6), _0x2ac531 = calcConstPremium(_0x26e30e['name'], _0x26e30e['const'], _0x31bda6);
        _0x5e0ccc += _0x2e2932 + _0x2ac531;
        if (_0x1d1f85 && !_0x1f43a8['includes'](_0x26e30e['name']))
            _0x1f43a8['push'](_0x26e30e['name']);
        let _0x11cc60 = 0x0;
        _0x26e30e['const'] >= 0x6 && (_0x11cc60 = _0x511d16[_0x26e30e['tier']] != null ? _0x511d16[_0x26e30e['tier']] : FULL_CONST_WEIGHT[_0x26e30e['tier']] || 0x0, _0x1350f6 += _0x11cc60);
        let _0x5ee4ba = 0x0;
        if (_0x1d1f85) {
            const _0x54017a = _sigWeaponsOverride ? _sigWeaponsOverride[_0x26e30e['name']] || SIG_WEAPONS[_0x26e30e['name']] : SIG_WEAPONS[_0x26e30e['name']];
            if (_0x54017a) {
                const _0x38e679 = _0x1b42e7['weapons']['find'](function (_0x40318e) {
                    return _0x40318e['name'] === _0x54017a || _0x40318e['name']['includes'](_0x54017a) || _0x54017a['includes'](_0x40318e['name']);
                });
                if (_0x38e679)
                    _0x5ee4ba = _0x38e679['refine'] || 0x1;
            }
        }
        _0x147094['push']({
            'name': _0x26e30e['name'],
            'const': _0x26e30e['const'],
            'tier': _0x26e30e['tier'],
            'isHot': !!_0x26e30e['isHot'],
            'hasSig': _0x1d1f85,
            'sigRefine': _0x5ee4ba,
            'premium': _0x2ac531,
            'value': Math['round'](_0x2e2932 + _0x2ac531)
        }), _0x2f4b5e['push']({
            'name': _0x26e30e['name'],
            'const': _0x26e30e['const'],
            'tier': _0x26e30e['tier'],
            'hasSig': _0x1d1f85,
            'value': Math['round'](_0x2e2932 + _0x2ac531)
        });
    }
    let _0x5240b3 = 0x0;
    const _0x5934df = [], _0x14b618 = _0x31bda6['c6MultiBonus'] || [], _0x30ded9 = _0x147094['filter'](_0x562737 => _0x562737['const'] >= 0x6 && _0x562737['tier'] && _0x562737['tier'] !== 'E'), _0x3004c7 = {};
    for (const _0x3e5c79 of _0x30ded9) {
        _0x3004c7[_0x3e5c79['tier']] = (_0x3004c7[_0x3e5c79['tier']] || 0x0) + 0x1;
    }
    let _0x2cbea7 = 0x0;
    if (_0x1350f6 >= 0x2 && _0x14b618['length'] > 0x0) {
        const _0x4f1d27 = [..._0x14b618]['sort']((_0x253b01, _0x5e735c) => _0x253b01['count'] - _0x5e735c['count']);
        let _0x45ef06 = null, _0x3ce342 = null;
        for (const _0x28a130 of _0x4f1d27) {
            if (_0x1350f6 >= _0x28a130['count'])
                _0x45ef06 = _0x28a130;
            else {
                if (!_0x3ce342)
                    _0x3ce342 = _0x28a130;
            }
        }
        if (_0x45ef06 && _0x3ce342) {
            const _0x36b82e = (_0x1350f6 - _0x45ef06['count']) / (_0x3ce342['count'] - _0x45ef06['count']);
            _0x2cbea7 = Math['max'](_0x3ce342['bonus'] * _0x36b82e, _0x45ef06['bonus']);
        } else
            _0x45ef06 && (_0x2cbea7 = _0x45ef06['bonus']);
    }
    if (_0x2cbea7 > 0x0) {
        _0x5240b3 = _0x5e0ccc * _0x2cbea7;
        const _0x3ccaa6 = Object['entries'](_0x3004c7)['sort']((_0x281342, _0x1af0bd) => (_0x511d16[_0x281342[0x0]] || 0x0) < (_0x511d16[_0x1af0bd[0x0]] || 0x0) ? 0x1 : -0x1)['map'](([_0x5b1079, _0x142a6e]) => _0x142a6e + '个' + _0x5b1079 + '级')['join']('+');
        _0x5934df['push']('满命(' + _0x3ccaa6 + ')\x20加权' + _0x1350f6['toFixed'](0x1) + '\x20+' + Math['round'](_0x2cbea7 * 0x64) + '%');
    }
    const _0x4d03b1 = _0x31bda6['pullC6Bonus'] || [];
    let _0x1ead53 = 0x0;
    if (_0x1350f6 >= 0x1 && _0x4d03b1['length'] > 0x0) {
        const _0x49face = [..._0x4d03b1]['sort']((_0x5dc680, _0x543d28) => _0x5dc680['count'] - _0x543d28['count']);
        let _0x7bfb9b = null, _0x8c4534 = null;
        for (const _0x23403d of _0x49face) {
            if (_0x1350f6 >= _0x23403d['count'])
                _0x7bfb9b = _0x23403d;
            else {
                if (!_0x8c4534)
                    _0x8c4534 = _0x23403d;
            }
        }
        if (_0x7bfb9b && _0x8c4534) {
            const _0x260355 = (_0x1350f6 - _0x7bfb9b['count']) / (_0x8c4534['count'] - _0x7bfb9b['count']);
            _0x1ead53 = Math['max'](_0x8c4534['bonus'] * _0x260355, _0x7bfb9b['bonus']);
        } else
            _0x7bfb9b && (_0x1ead53 = _0x7bfb9b['bonus']);
    }
    let _0x44fb0e = 0x0;
    const _0x521bd3 = [], _0x19d08a = new Set(_0x1b42e7['characters']['map'](_0x337942 => _0x337942['name'])), _0x431c3c = weights && weights['teams'] || DEFAULT_TEAMS, _0x5a948b = [];
    for (const _0x1f04d3 of _0x431c3c) {
        const _0x5a7c62 = _0x1f04d3['members']['every'](_0x4b86da => _0x19d08a['has'](_0x4b86da));
        if (_0x5a7c62)
            _0x5a948b['push'](_0x1f04d3);
    }
    const _0x28dadd = _0x31bda6['teamMultiBonus'] || [], _0x250de3 = {};
    for (const _0x4f8910 of _0x28dadd) {
        _0x250de3[_0x4f8910['count']] = _0x4f8910;
    }
    const _0x4e609d = Object['values'](_0x250de3);
    let _0x522ac6 = 0x1;
    for (const _0x268676 of _0x4e609d) {
        _0x5a948b['length'] >= _0x268676['count'] && (_0x522ac6 = Math['max'](_0x522ac6, _0x268676['coef']));
    }
    for (const _0x5d76a1 of _0x5a948b) {
        for (const _0x52182e of _0x5d76a1['members']) {
            const _0x498372 = _0x1b42e7['characters']['find'](_0x44277a => _0x44277a['name'] === _0x52182e);
            if (_0x498372) {
                const _0x336c3b = checkHasSigWeapon(_0x52182e, _0x460e9b, _0x2bf760), _0x2a4923 = getCharValue(_0x498372, _0x336c3b, _0x31bda6);
                _0x44fb0e += _0x2a4923 * (_0x5d76a1['multiplier'] - 0x1);
            }
        }
    }
    _0x44fb0e *= _0x522ac6;
    if (_0x5a948b['length'] > 0x0) {
        const _0x492e49 = _0x5a948b['map'](_0xa924d6 => _0xa924d6['name'])['join']('/');
        _0x521bd3['push'](_0x5a948b['length'] + '配队(' + _0x492e49 + ')\x20×' + _0x522ac6);
    }
    const _0x251b30 = calculatePullValue(_0x1b42e7['pulls']), _0x4eab94 = _0x251b30['total'], _0x14921f = Math['round'](_0x4eab94 * _0x1ead53), _0x1a506c = _0x4eab94 + _0x14921f, _0x3de5c6 = extractListItems(_0x1b42e7['rawText'], '服饰'), _0x46ae57 = extractListItems(_0x1b42e7['rawText'], '摩托饰品')['concat'](extractListItems(_0x1b42e7['rawText'], '摩托')), _0x557108 = extractListItems(_0x1b42e7['rawText'], '车架模组')['concat'](extractListItems(_0x1b42e7['rawText'], '车架')), _0x1e7390 = extractListItems(_0x1b42e7['rawText'], '涂装'), _0x48b541 = _0x3de5c6['length'] * (_0x31bda6['outfit'] || 0x0), _0x798bd9 = _0x46ae57['length'] * (_0x31bda6['motoAccessory'] || 0x0), _0x29cbe0 = _0x557108['length'] * (_0x31bda6['motoFrame'] || 0x0), _0x2e433f = _0x1e7390['length'] * (_0x31bda6['paint'] || 0x0), _0x469cd1 = _0x48b541 + _0x798bd9 + _0x29cbe0 + _0x2e433f, _0x1da9a1 = _0x1b42e7['weapons']['map'](_0x407cac => {
            const _0x4c0d64 = _0x1b42e7['characters']['some'](_0x369fa7 => {
                const _0x56193e = _sigWeaponsOverride ? _sigWeaponsOverride[_0x369fa7['name']] || SIG_WEAPONS[_0x369fa7['name']] : SIG_WEAPONS[_0x369fa7['name']];
                return _0x56193e === _0x407cac['name'] && _0x1f43a8['includes'](_0x369fa7['name']);
            });
            return {
                'name': _0x407cac['name'],
                'refine': _0x407cac['refine'],
                'isSig': _0x4c0d64
            };
        }), _0x503cd2 = getYellowCoeff(_0x1b42e7['yellowCount']), _0x4f20f2 = _0x503cd2['coefficient'], _0x181a33 = (_0x1b42e7['rawText'] || '')['match'](/(\d+)级/), _0x3fd27d = _0x181a33 ? parseInt(_0x181a33[0x1]) : 0x1, _0x1e62f4 = (_0x1b42e7['rawText'] || '')['match'](/(\d+)个四星角色/), _0xe98924 = _0x1e62f4 ? parseInt(_0x1e62f4[0x1]) : 0x0, _0x254d95 = _0x1b42e7['characters']['length'], _0xb4292f = _0x1b42e7['characters']['filter'](_0x1f8b0a => _0x1f8b0a['const'] >= 0x6)['length'], _0x3ac9dd = _0x5e0ccc + _0x5240b3 + _0x44fb0e + _0x1a506c + _0x469cd1;
    let _0x55256e = 0x1;
    const _0x2a27a1 = [], _0x1adc61 = _0x31bda6['flatDiscountRules'] || [];
    if (_0x1adc61['length'] > 0x0)
        for (const _0x1ee377 of _0x1adc61) {
            if (!_0x1ee377['chars'] || _0x1ee377['chars']['length'] === 0x0)
                continue;
            const _0x48ba45 = _0x1ee377['chars']['filter'](_0x2be44f => _0x19d08a['has'](_0x2be44f));
            if (_0x48ba45['length'] === 0x0)
                continue;
            const _0x521493 = _0x1ee377['chars']['every'](_0x1208c6 => {
                const _0x21d271 = _0x1b42e7['characters']['find'](_0x4ff540 => _0x4ff540['name'] === _0x1208c6);
                return !_0x21d271 || _0x21d271['const'] <= _0x1ee377['maxConst'];
            });
            _0x521493 && (_0x55256e = Math['min'](_0x55256e, _0x1ee377['discount']), _0x2a27a1['push']('低命折扣系数(' + _0x48ba45['join']('/') + '\x20≤' + _0x1ee377['maxConst'] + '命)\x20×' + _0x1ee377['discount']));
        }
    const _0x510bd9 = Math['min'](_0x4f20f2, _0x55256e), _0xd79b54 = _0x3ac9dd * _0x510bd9, _0x355da6 = _0x3b19a1 > 0x0 ? (_0xd79b54 - _0x3b19a1) / _0x3b19a1 * 0x64 : 0x0, _0x383458 = Math['round']((_0xd79b54 - _0x3b19a1) * 0x64) / 0x64;
    return {
        'totalValue': Math['round'](_0xd79b54 * 0x64) / 0x64,
        'diff': _0x383458,
        'charValue': Math['round'](_0x5e0ccc * 0x64) / 0x64,
        'fullConstPremium': Math['round'](_0x5240b3 * 0x64) / 0x64,
        'teamPremium': Math['round'](_0x44fb0e * 0x64) / 0x64,
        'pullValue': Math['round'](_0x1a506c * 0x64) / 0x64,
        'otherResources': _0x469cd1,
        'yellowCoeff': _0x4f20f2,
        'weightedFullConst': _0x1350f6,
        'satisfiedTeams': _0x5a948b['map'](_0x34a856 => _0x34a856['name']),
        'ratio': Math['round'](_0x355da6 * 0xa) / 0xa,
        'charBreakdown': _0x147094,
        'charDetails': _0x2f4b5e,
        'hasSignatureWeapons': _0x1f43a8,
        'weaponDetails': _0x1da9a1,
        'matchedTeams': _0x5a948b,
        'c6Bonus': {
            'value': Math['round'](_0x5240b3),
            'notes': _0x5934df
        },
        'teamBonus': {
            'value': Math['round'](_0x44fb0e),
            'notes': _0x521bd3
        },
        'flatDiscount': {
            'value': _0x55256e,
            'notes': _0x2a27a1
        },
        'pullInfo': {
            'pulls': _0x251b30['pulls'],
            'perPull': _0x251b30['perPull'],
            'tierLabel': _0x251b30['tierLabel'],
            'baseTotal': Math['round'](_0x4eab94 * 0x64) / 0x64,
            'c6Bonus': _0x14921f,
            'c6Multiplier': _0x1ead53,
            'total': _0x1a506c
        },
        'yellowInfo': _0x503cd2,
        'outfits': _0x3de5c6,
        'motoAccessories': _0x46ae57,
        'motoFrames': _0x557108,
        'paints': _0x1e7390,
        'level': _0x3fd27d,
        'fourStarChars': _0xe98924,
        'fiveStarChars': _0x254d95,
        'maxConstChars': _0xb4292f
    };
}
function evaluateWithPrice(_0x30625a, _0x3b4dc3, _0x4ee65e) {
    const _0x1bd925 = weights, _0x6e8ba2 = _sigWeaponsOverride;
    _0x4ee65e && (weights = buildDefaultWeights(_0x4ee65e), _sigWeaponsOverride = weights['sigWeaponsOverride'] || null);
    try {
        const _0x10bb40 = parseAccountInfo(_0x30625a), _0x382152 = _0x3b4dc3 / 0x64, _0x5a9b43 = calculateValue(_0x10bb40, _0x382152);
        let _0x238fe8 = 0x0;
        _0x382152 > 0x0 && (_0x238fe8 = (_0x5a9b43['totalValue'] - _0x382152) / _0x382152 * 0x64);
        _0x238fe8 = Math['round'](_0x238fe8 * 0x64) / 0x64;
        const _0x5e8990 = {
                'characters': _0x10bb40['characters'],
                'weapons': _0x10bb40['weapons'],
                'starSounds': _0x10bb40['starSound'],
                'moonPhases': _0x10bb40['moonPhase'],
                'coral': _0x10bb40['aftermathCoral'],
                'goldenRipples': _0x10bb40['floatGoldRipple'],
                'tideRipples': _0x10bb40['castTideRipple'],
                'yellowCount': _0x10bb40['yellowCount'],
                'outfits': _0x10bb40['outfitCount'],
                'motorcycles': _0x10bb40['motoCount'],
                'pulls': _0x10bb40['pulls'],
                'rawText': _0x10bb40['rawText']
            }, _0x11fe3a = {
                ..._0x5a9b43,
                'finalValue': _0x5a9b43['totalValue'],
                'characterValue': _0x5a9b43['charValue'],
                'c6Premium': _0x5a9b43['fullConstPremium'],
                'teamPremium': _0x5a9b43['teamPremium'],
                'pullValue': _0x5a9b43['pullValue'],
                'resourceValue': _0x5a9b43['otherResources'],
                'yellowMultiplier': _0x5a9b43['yellowCoeff'],
                'characters': _0x5a9b43['charBreakdown']
            };
        return {
            'info': _0x5e8990,
            'details': _0x11fe3a,
            'priceInYuan': _0x382152,
            'costPerformance': _0x238fe8
        };
    } finally {
        weights = _0x1bd925, _sigWeaponsOverride = _0x6e8ba2;
    }
}
function generateShortDescription(_0x4bdb93) {
    const _0xf5b2d3 = _0x4bdb93['details'] && _0x4bdb93['details']['characters'] || [];
    if (_0xf5b2d3['length'] === 0x0)
        return '无已知角色';
    const _0x49815 = [..._0xf5b2d3]['sort']((_0x33c867, _0x14003b) => _0x14003b['value'] - _0x33c867['value'])['slice'](0x0, 0x5), _0x3e3aa4 = _0x49815['map'](_0x4e4895 => {
            const _0x1d3f64 = _0x4e4895['const'] >= 0x6 ? '满命' : _0x4e4895['const'] + '命', _0x4f4e5c = _0x4e4895['hasSig'] ? '+专武' : '';
            return '' + _0x1d3f64 + _0x4e4895['name'] + _0x4f4e5c;
        });
    let _0x4eb5e9 = _0x3e3aa4['join'](',\x20');
    const _0x449e60 = _0x4bdb93['info'] && _0x4bdb93['info']['yellowCount'];
    return _0x449e60 > 0x0 && (_0x4eb5e9 += '\x20|\x20' + _0x449e60 + '黄'), _0x4eb5e9;
}
module['exports'] = {
    'CONFIG_VERSION': CONFIG_VERSION,
    'CHAR_TIERS': CHAR_TIERS,
    'SIG_WEAPONS': SIG_WEAPONS,
    'FULL_CONST_WEIGHT': FULL_CONST_WEIGHT,
    'CHAR_LOOKUP': CHAR_LOOKUP,
    'CHAR_ALIASES': CHAR_ALIASES,
    'SECTION_KEYWORDS': SECTION_KEYWORDS,
    'DEFAULT_WEIGHTS': DEFAULT_WEIGHTS,
    'DEFAULT_TEAMS': DEFAULT_TEAMS,
    'DEFAULT_PULL_TIERS': DEFAULT_PULL_TIERS,
    'DEFAULT_YELLOW_TIERS': DEFAULT_YELLOW_TIERS,
    'DEFAULT_CHAR_PRICES': DEFAULT_CHAR_PRICES,
    'DEFAULT_CONST_PREMIUMS': DEFAULT_CONST_PREMIUMS,
    'DEFAULT_NEED_SIG_WEAPONS': DEFAULT_NEED_SIG_WEAPONS,
    'buildDefaultCharPrices': buildDefaultCharPrices,
    'buildDefaultTeamPremiums': buildDefaultTeamPremiums,
    'buildDefaultWeights': buildDefaultWeights,
    'getDefaults': getDefaults,
    'parseAccountInfo': parseAccountInfo,
    'extractSection': extractSection,
    'extractNumber': extractNumber,
    'parseCharacters': parseCharacters,
    'findCharsInText': findCharsInText,
    'parseWeapons': parseWeapons,
    'extractYellowCount': extractYellowCount,
    'extractListCount': extractListCount,
    'extractListItems': extractListItems,
    'checkHasSigWeapon': checkHasSigWeapon,
    'calcConstPremium': calcConstPremium,
    'getCharValue': getCharValue,
    'calculatePullValue': calculatePullValue,
    'getYellowCoeff': getYellowCoeff,
    'calculateValue': calculateValue,
    'evaluateWithPrice': evaluateWithPrice,
    'generateShortDescription': generateShortDescription
};