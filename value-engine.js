'use strict';
const CONFIG_VERSION = 0x5, CHAR_TIERS = {
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
                'tiers': [
                    'S',
                    'A'
                ],
                'maxConst': 0x2,
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
        },
        {
            'name': '绯洛穗',
            'members': [
                '绯雪',
                '洛瑟菈',
                '穗穗'
            ],
            'multiplier': 1.6
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
            'maxYellow': 0x82,
            'coefficient': 1.35
        },
        {
            'minYellow': 0x82,
            'maxYellow': 0x8c,
            'coefficient': 1.4
        },
        {
            'minYellow': 0x8c,
            'maxYellow': 0x96,
            'coefficient': 1.45
        },
        {
            'minYellow': 0x96,
            'maxYellow': 0xa0,
            'coefficient': 1.5
        },
        {
            'minYellow': 0xa0,
            'maxYellow': 0xaa,
            'coefficient': 1.55
        },
        {
            'minYellow': 0xaa,
            'maxYellow': 0xb4,
            'coefficient': 1.6
        },
        {
            'minYellow': 0xb4,
            'maxYellow': 0xbe,
            'coefficient': 1.65
        },
        {
            'minYellow': 0xbe,
            'maxYellow': 0xc8,
            'coefficient': 1.7
        },
        {
            'minYellow': 0xc8,
            'maxYellow': 0xd2,
            'coefficient': 1.75
        },
        {
            'minYellow': 0xd2,
            'maxYellow': 0xdc,
            'coefficient': 1.8
        },
        {
            'minYellow': 0xdc,
            'maxYellow': 0xe6,
            'coefficient': 1.85
        },
        {
            'minYellow': 0xe6,
            'maxYellow': 0xf0,
            'coefficient': 1.9
        },
        {
            'minYellow': 0xf0,
            'maxYellow': 0xfa,
            'coefficient': 1.95
        },
        {
            'minYellow': 0xfa,
            'maxYellow': 0x104,
            'coefficient': 0x2
        },
        {
            'minYellow': 0x104,
            'maxYellow': 0x10e,
            'coefficient': 2.05
        },
        {
            'minYellow': 0x10e,
            'maxYellow': 0x118,
            'coefficient': 2.1
        },
        {
            'minYellow': 0x118,
            'maxYellow': 0x122,
            'coefficient': 2.15
        },
        {
            'minYellow': 0x122,
            'maxYellow': 0x12c,
            'coefficient': 2.2
        },
        {
            'minYellow': 0x12c,
            'maxYellow': 0x3e7,
            'coefficient': 2.25
        }
    ], DEFAULT_CHAR_PRICES = {
        '爱弥斯': 0x2d,
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
        },
        '穗穗': {
            '2': 0x32,
            '6': 0x78
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
    const _0x330e9b = {};
    for (const _0x56f3ea of Object['keys'](CHAR_TIERS)) {
        for (const _0x4cb695 of CHAR_TIERS[_0x56f3ea]['chars']) {
            _0x330e9b[_0x4cb695] = DEFAULT_CHAR_PRICES[_0x4cb695] != null ? DEFAULT_CHAR_PRICES[_0x4cb695] : CHAR_TIERS[_0x56f3ea]['price'];
        }
    }
    return _0x330e9b;
}
function buildDefaultTeamPremiums() {
    const _0x3c27f6 = {};
    for (const _0x301821 of DEFAULT_TEAMS) {
        _0x3c27f6[_0x301821['name']] = {
            'chars': [..._0x301821['members'] || []],
            'multiplier': _0x301821['multiplier'] || 0x1,
            'enabled': !![]
        };
    }
    return _0x3c27f6;
}
function buildDefaultWeights(_0x312da7) {
    const _0x105f0a = _0x312da7 || {}, _0x291dba = Object['assign']({}, DEFAULT_WEIGHTS, _0x105f0a);
    _0x291dba['c6TierWeights'] = Object['assign']({}, DEFAULT_WEIGHTS['c6TierWeights'], _0x105f0a['c6TierWeights'] || {}), _0x291dba['c6MultiBonus'] = _0x105f0a['c6MultiBonus'] && _0x105f0a['c6MultiBonus']['length'] ? _0x105f0a['c6MultiBonus'] : DEFAULT_WEIGHTS['c6MultiBonus'], _0x291dba['pullC6Bonus'] = _0x105f0a['pullC6Bonus'] && _0x105f0a['pullC6Bonus']['length'] ? _0x105f0a['pullC6Bonus'] : DEFAULT_WEIGHTS['pullC6Bonus'], _0x291dba['teamMultiBonus'] = _0x105f0a['teamMultiBonus'] && _0x105f0a['teamMultiBonus']['length'] ? _0x105f0a['teamMultiBonus'] : DEFAULT_WEIGHTS['teamMultiBonus'], _0x291dba['flatDiscountRules'] = _0x105f0a['flatDiscountRules'] && _0x105f0a['flatDiscountRules']['length'] ? _0x105f0a['flatDiscountRules'] : DEFAULT_WEIGHTS['flatDiscountRules'], _0x291dba['pullTiers'] = _0x105f0a['pullTiers'] && _0x105f0a['pullTiers']['length'] ? _0x105f0a['pullTiers'] : DEFAULT_PULL_TIERS, _0x291dba['yellowTiers'] = _0x105f0a['yellowTiers'] && _0x105f0a['yellowTiers']['length'] ? _0x105f0a['yellowTiers'] : DEFAULT_YELLOW_TIERS, _0x291dba['charPrices'] = Object['assign']({}, buildDefaultCharPrices(), _0x105f0a['charPrices'] || {}), _0x291dba['constPremiums'] = Object['assign']({}, DEFAULT_CONST_PREMIUMS, _0x105f0a['constPremiums'] || {}), _0x291dba['teamPremiums'] = _0x105f0a['teamPremiums'] || buildDefaultTeamPremiums(), _0x291dba['teams'] = [];
    for (const _0xfd84b4 of Object['keys'](_0x291dba['teamPremiums'])) {
        const _0x3ad9e5 = _0x291dba['teamPremiums'][_0xfd84b4];
        _0x3ad9e5 && _0x3ad9e5['enabled'] !== ![] && _0x291dba['teams']['push']({
            'name': _0xfd84b4,
            'members': _0x3ad9e5['chars'] || [],
            'multiplier': _0x3ad9e5['multiplier'] || 0x1
        });
    }
    return _0x291dba['needSigWeapons'] = _0x105f0a['needSigWeapons'] || DEFAULT_NEED_SIG_WEAPONS, _0x105f0a['sigWeaponsOverride'] && (_0x291dba['sigWeaponsOverride'] = _0x105f0a['sigWeaponsOverride']), _0x291dba;
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
function extractSection(_0x4ec3a8, _0x4c8d65) {
    const _0x4a9353 = _0x4c8d65['replace'](/[.*+?^${}()|[\]\\]/g, '\x5c$&'), _0x465549 = SECTION_KEYWORDS['filter'](_0x18a70c => _0x18a70c !== _0x4c8d65)['map'](_0x161505 => '【?' + _0x161505['replace'](/[.*+?^${}()|[\]\\]/g, '\x5c$&') + '(?:[（(]\x5cd+[）)])?(?:[：:]|\x5cs*\x5cn|】)'), _0x29ff46 = _0x4a9353 + '[：:]\x5cs*([\x5cs\x5cS]*?)(?=' + _0x465549['join']('|') + '|$)', _0x47e850 = _0x4ec3a8['match'](new RegExp(_0x29ff46));
    if (_0x47e850)
        return _0x47e850[0x1]['trim']();
    const _0x4a2669 = _0x4a9353 + '[（(]\x5cd+[）)]\x5cs*[：:]?\x5cs*\x5cn?\x5cs*([\x5cs\x5cS]*?)(?=' + _0x465549['join']('|') + '|$)', _0xee7741 = _0x4ec3a8['match'](new RegExp(_0x4a2669));
    if (_0xee7741)
        return _0xee7741[0x1]['trim']();
    const _0x16703c = '【' + _0x4a9353 + '】\x5cs*[：:]?\x5cs*([\x5cs\x5cS]*?)(?=' + _0x465549['join']('|') + '|$)', _0x32f3fb = _0x4ec3a8['match'](new RegExp(_0x16703c));
    if (_0x32f3fb)
        return _0x32f3fb[0x1]['trim']();
    return '';
}
function extractNumber(_0x284c06, _0x57c40d) {
    const _0x537d52 = _0x57c40d['replace'](/[.*+?^${}()|[\]\\]/g, '\x5c$&'), _0x8ef3d2 = _0x284c06['match'](new RegExp(_0x537d52 + '[：:]\x5cs*(\x5cd[\x5cd,]*)', 'i'));
    if (_0x8ef3d2)
        return parseInt(_0x8ef3d2[0x1]['replace'](/,/g, ''));
    const _0x46302e = _0x284c06['match'](new RegExp('【' + _0x537d52 + '】\x5cs*[：:]?\x5cs*(\x5cd[\x5cd,]*)', 'i'));
    if (_0x46302e)
        return parseInt(_0x46302e[0x1]['replace'](/,/g, ''));
    return 0x0;
}
function parseCharacters(_0x14af49) {
    const _0x5a9f6e = [];
    if (!_0x14af49)
        return _0x5a9f6e;
    const _0x28354a = _0x14af49['split'](/[,，、\s;；]+/)['filter'](_0x29f695 => _0x29f695['length'] > 0x0);
    for (const _0x31dd48 of _0x28354a) {
        let _0x302188 = 0x0, _0xde6a9c = '', _0x3b99fe = _0x31dd48['match'](/^满命(.+)$/);
        _0x3b99fe ? (_0x302188 = 0x6, _0xde6a9c = _0x3b99fe[0x1]) : (_0x3b99fe = _0x31dd48['match'](/^(\d+)命(.+)$/), _0x3b99fe ? (_0x302188 = parseInt(_0x3b99fe[0x1]), _0xde6a9c = _0x3b99fe[0x2]) : (_0x3b99fe = _0x31dd48['match'](/^(.+?)\(满命\)$/), _0x3b99fe ? (_0xde6a9c = _0x3b99fe[0x1], _0x302188 = 0x6) : (_0x3b99fe = _0x31dd48['match'](/^(.+?)\((\d+)命\)$/), _0x3b99fe ? (_0xde6a9c = _0x3b99fe[0x1], _0x302188 = parseInt(_0x3b99fe[0x2])) : (_0xde6a9c = _0x31dd48, _0x302188 = 0x0))));
        const _0x15832f = CHAR_ALIASES[_0xde6a9c] || _0xde6a9c, _0x1279d5 = CHAR_LOOKUP[_0x15832f];
        _0x1279d5 && _0x5a9f6e['push']({
            'name': _0x15832f,
            'const': _0x302188,
            'tier': _0x1279d5['tier'],
            'price': _0x1279d5['price'],
            'isHot': _0x1279d5['isHot']
        });
    }
    const _0x153bab = {};
    for (const _0x362a4c of _0x5a9f6e) {
        (!_0x153bab[_0x362a4c['name']] || _0x362a4c['const'] > _0x153bab[_0x362a4c['name']]['const']) && (_0x153bab[_0x362a4c['name']] = _0x362a4c);
    }
    return Object['values'](_0x153bab);
}
function findCharsInText(_0x5becfe) {
    const _0x5935c3 = [];
    for (const [_0x576833, _0x53dabf] of Object['entries'](CHAR_TIERS)) {
        for (const _0x33738f of _0x53dabf['chars']) {
            const _0x92f1a7 = [_0x33738f];
            for (const [_0x4a6137, _0xd409f] of Object['entries'](CHAR_ALIASES)) {
                if (_0xd409f === _0x33738f)
                    _0x92f1a7['push'](_0x4a6137);
            }
            let _0x580c2e = ![];
            for (const _0x6de2bd of _0x92f1a7) {
                if (_0x5becfe['includes']('满命' + _0x6de2bd)) {
                    _0x5935c3['push']({
                        'name': _0x33738f,
                        'const': 0x6,
                        'tier': _0x576833,
                        'price': _0x53dabf['price'],
                        'isHot': _0x53dabf['isHot']
                    }), _0x580c2e = !![];
                    break;
                }
                const _0x22f406 = _0x5becfe['match'](new RegExp('(\x5cd+)命' + _0x6de2bd));
                if (_0x22f406) {
                    _0x5935c3['push']({
                        'name': _0x33738f,
                        'const': parseInt(_0x22f406[0x1]),
                        'tier': _0x576833,
                        'price': _0x53dabf['price'],
                        'isHot': _0x53dabf['isHot']
                    }), _0x580c2e = !![];
                    break;
                }
                if (_0x5becfe['includes'](_0x6de2bd + '(满命)')) {
                    _0x5935c3['push']({
                        'name': _0x33738f,
                        'const': 0x6,
                        'tier': _0x576833,
                        'price': _0x53dabf['price'],
                        'isHot': _0x53dabf['isHot']
                    }), _0x580c2e = !![];
                    break;
                }
                const _0x1bbe87 = _0x5becfe['match'](new RegExp(_0x6de2bd + '\x5c((\x5cd+)命\x5c)'));
                if (_0x1bbe87) {
                    _0x5935c3['push']({
                        'name': _0x33738f,
                        'const': parseInt(_0x1bbe87[0x1]),
                        'tier': _0x576833,
                        'price': _0x53dabf['price'],
                        'isHot': _0x53dabf['isHot']
                    }), _0x580c2e = !![];
                    break;
                }
                if (_0x5becfe['includes'](_0x6de2bd)) {
                    _0x5935c3['push']({
                        'name': _0x33738f,
                        'const': 0x0,
                        'tier': _0x576833,
                        'price': _0x53dabf['price'],
                        'isHot': _0x53dabf['isHot']
                    }), _0x580c2e = !![];
                    break;
                }
            }
        }
    }
    const _0x40a55f = {};
    for (const _0x58d797 of _0x5935c3) {
        (!_0x40a55f[_0x58d797['name']] || _0x58d797['const'] > _0x40a55f[_0x58d797['name']]['const']) && (_0x40a55f[_0x58d797['name']] = _0x58d797);
    }
    return Object['values'](_0x40a55f);
}
function parseWeapons(_0x26bac6) {
    const _0x57a6f1 = [];
    if (!_0x26bac6)
        return _0x57a6f1;
    const _0x5aacb1 = _0x26bac6['split'](/[,，、\s;；]+/)['filter'](_0x38570b => _0x38570b['length'] > 0x0);
    for (const _0xdd8281 of _0x5aacb1) {
        let _0x2bee2b = 0x1, _0x38d4b7 = '';
        const _0x49c450 = _0xdd8281['match'](/^精(\d+)(.+)$/);
        _0x49c450 ? (_0x2bee2b = parseInt(_0x49c450[0x1]), _0x38d4b7 = _0x49c450[0x2]) : (_0x38d4b7 = _0xdd8281, _0x2bee2b = 0x1);
        if (_0x38d4b7)
            _0x57a6f1['push']({
                'name': _0x38d4b7,
                'refine': _0x2bee2b
            });
    }
    return _0x57a6f1;
}
function extractYellowCount(_0x4aa25a) {
    let _0x1892cc = _0x4aa25a['match'](/(\d+)\s*黄/);
    if (_0x1892cc)
        return parseInt(_0x1892cc[0x1]);
    _0x1892cc = _0x4aa25a['match'](/黄[数]?[：:]\s*(\d+)/);
    if (_0x1892cc)
        return parseInt(_0x1892cc[0x1]);
    _0x1892cc = _0x4aa25a['match'](/【黄[数]?】\s*[：:]?\s*(\d+)/);
    if (_0x1892cc)
        return parseInt(_0x1892cc[0x1]);
    return 0x0;
}
function extractListCount(_0x4f7430, _0x5a10fa) {
    const _0x2440b7 = extractSection(_0x4f7430, _0x5a10fa);
    if (!_0x2440b7)
        return 0x0;
    const _0x485d46 = _0x2440b7['split'](/[,，、\s]+/)['filter'](_0x4f5fec => _0x4f5fec['length'] > 0x0);
    return _0x485d46['length'];
}
function extractListItems(_0x1501c7, _0x3204ab) {
    const _0x503d83 = extractSection(_0x1501c7, _0x3204ab);
    if (!_0x503d83)
        return [];
    return _0x503d83['split'](/[,，、\s]+/)['filter'](_0x217999 => _0x217999['length'] > 0x0);
}
function parseAccountInfo(_0x2a2e18) {
    const _0x51cb00 = {
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
        'rawText': _0x2a2e18 || ''
    };
    if (!_0x2a2e18)
        return _0x51cb00;
    const _0x9fd513 = extractSection(_0x2a2e18, '五星角色');
    _0x9fd513 && (_0x51cb00['characters'] = parseCharacters(_0x9fd513));
    _0x51cb00['characters']['length'] === 0x0 && (_0x51cb00['characters'] = findCharsInText(_0x2a2e18));
    let _0x754169 = extractSection(_0x2a2e18, '五星武器');
    _0x754169 && (_0x51cb00['weapons'] = parseWeapons(_0x754169));
    _0x51cb00['weapons']['length'] === 0x0 && (_0x754169 = extractSection(_0x2a2e18, '武器'), _0x754169 && (_0x51cb00['weapons'] = parseWeapons(_0x754169)));
    _0x51cb00['weapons']['length'] === 0x0 && (_0x754169 = extractSection(_0x2a2e18, '金色武器'), _0x754169 && (_0x51cb00['weapons'] = parseWeapons(_0x754169)));
    _0x51cb00['starSound'] = extractNumber(_0x2a2e18, '星声'), _0x51cb00['moonPhase'] = extractNumber(_0x2a2e18, '月相'), _0x51cb00['aftermathCoral'] = extractNumber(_0x2a2e18, '余波珊瑚'), _0x51cb00['floatGoldRipple'] = extractNumber(_0x2a2e18, '浮金波纹'), _0x51cb00['castTideRipple'] = extractNumber(_0x2a2e18, '铸潮波纹'), _0x51cb00['yellowCount'] = extractYellowCount(_0x2a2e18), _0x51cb00['outfitCount'] = extractListCount(_0x2a2e18, '服饰');
    if (_0x51cb00['outfitCount'] === 0x0) {
        const _0x3b5090 = extractSection(_0x2a2e18, '皮肤');
        if (_0x3b5090) {
            const _0x52e1a9 = parseInt(_0x3b5090);
            _0x51cb00['outfitCount'] = isNaN(_0x52e1a9) ? extractListCount(_0x2a2e18, '皮肤') : _0x52e1a9;
        }
    }
    return _0x51cb00['motoCount'] = extractListCount(_0x2a2e18, '车架模组') + extractListCount(_0x2a2e18, '车架') + extractListCount(_0x2a2e18, '摩托'), _0x51cb00['motoAccessoryCount'] = extractListCount(_0x2a2e18, '摩托饰品'), _0x51cb00['vehicleFrameCount'] = extractListCount(_0x2a2e18, '车架模组') + extractListCount(_0x2a2e18, '车架'), _0x51cb00['paintCount'] = extractListCount(_0x2a2e18, '涂装'), _0x51cb00['pulls'] = _0x51cb00['starSound'] / 0xa0 + _0x51cb00['moonPhase'] / 0xa0 + _0x51cb00['aftermathCoral'] / 0x8 + _0x51cb00['floatGoldRipple'] + _0x51cb00['castTideRipple'], _0x51cb00;
}
function checkHasSigWeapon(_0x4b1525, _0x5cca0c, _0x278217) {
    const _0x2c9e55 = _sigWeaponsOverride ? _sigWeaponsOverride[_0x4b1525] || SIG_WEAPONS[_0x4b1525] : SIG_WEAPONS[_0x4b1525];
    if (!_0x2c9e55)
        return ![];
    if (_0x5cca0c && _0x5cca0c['some'](_0x1d25a2 => _0x1d25a2 === _0x2c9e55 || _0x1d25a2['includes'](_0x2c9e55) || _0x2c9e55['includes'](_0x1d25a2)))
        return !![];
    if (_0x278217 && _0x278217['includes'](_0x2c9e55))
        return !![];
    return ![];
}
function calcConstPremium(_0x4f090e, _0x541963, _0x9e971e) {
    _0x9e971e = _0x9e971e || weights || DEFAULT_WEIGHTS;
    const _0x1b4584 = _0x9e971e['constPremiums'] || {}, _0x5bc3b9 = _0x1b4584[_0x4f090e];
    if (!_0x5bc3b9 || _0x541963 <= 0x0)
        return 0x0;
    let _0xd01681 = 0x0;
    for (const _0x4a5a08 of Object['keys'](_0x5bc3b9)) {
        const _0x194c5a = parseInt(_0x4a5a08);
        if (!isNaN(_0x194c5a) && _0x541963 >= _0x194c5a) {
            const _0x3ece78 = _0x5bc3b9[_0x4a5a08] || 0x0;
            if (_0x3ece78 > _0xd01681)
                _0xd01681 = _0x3ece78;
        }
    }
    return _0xd01681;
}
function getCharValue(_0x349541, _0x246deb, _0x15d57a) {
    _0x15d57a = _0x15d57a || weights || DEFAULT_WEIGHTS;
    const _0x5b4325 = _0x15d57a['charPrices'] || {}, _0x1845a4 = _0x5b4325[_0x349541['name']] != null ? _0x5b4325[_0x349541['name']] : _0x349541['price'];
    if (_0x349541['isHot']) {
        const _0x1043dd = _0x15d57a['hotC0Mult'] != null ? _0x15d57a['hotC0Mult'] : 0x1, _0x4aeea8 = _0x15d57a['hotC3Mult'] != null ? _0x15d57a['hotC3Mult'] : 0x2, _0x595aeb = _0x15d57a['hotC6Mult'] != null ? _0x15d57a['hotC6Mult'] : 0x3, _0x40e7c7 = _0x15d57a['hotStepMult'] != null ? _0x15d57a['hotStepMult'] : 0.08, _0x33fcfc = _0x15d57a['hotNoSigMult'] != null ? _0x15d57a['hotNoSigMult'] : 0.15, _0x5a1bd3 = _0x15d57a['hotNoSigC6Mult'] != null ? _0x15d57a['hotNoSigC6Mult'] : 0.25;
        if (!_0x246deb) {
            if (_0x349541['const'] >= 0x6)
                return _0x1845a4 * _0x5a1bd3;
            return _0x1845a4 * _0x33fcfc;
        }
        if (_0x349541['const'] >= 0x6)
            return _0x1845a4 * _0x595aeb;
        if (_0x349541['const'] >= 0x3)
            return _0x1845a4 * _0x4aeea8;
        if (_0x349541['const'] >= 0x1)
            return _0x1845a4 * (_0x1043dd + _0x349541['const'] * _0x40e7c7);
        return _0x1845a4 * _0x1043dd;
    } else {
        const _0xbdf37a = _0x15d57a['coldStep'] != null ? _0x15d57a['coldStep'] : 0x1, _0x5c08df = _0x15d57a['coldC3Bonus'] != null ? _0x15d57a['coldC3Bonus'] : 0x3, _0xa962d5 = _0x15d57a['coldC6Bonus'] != null ? _0x15d57a['coldC6Bonus'] : 0x5, _0x2a8995 = _0x15d57a['coldSigBonus'] != null ? _0x15d57a['coldSigBonus'] : 0x2;
        let _0x2a17b6 = _0x1845a4 + _0x349541['const'] * _0xbdf37a;
        if (_0x349541['const'] >= 0x3)
            _0x2a17b6 += _0x5c08df;
        if (_0x349541['const'] >= 0x6)
            _0x2a17b6 += _0xa962d5;
        if (_0x246deb)
            _0x2a17b6 += _0x2a8995;
        return _0x2a17b6;
    }
}
function calculatePullValue(_0x2a2f80) {
    const _0x49aa57 = weights && weights['pullTiers'] || DEFAULT_PULL_TIERS, _0x568d01 = {};
    for (const _0x499f8d of _0x49aa57) {
        const _0xaef227 = (_0x499f8d['minPull'] || 0x0) + '-' + (_0x499f8d['maxPull'] == null ? 'inf' : _0x499f8d['maxPull']);
        _0x568d01[_0xaef227] = _0x499f8d;
    }
    const _0x40a3c7 = Object['values'](_0x568d01), _0x2ad685 = [..._0x40a3c7]['sort']((_0x178e43, _0x3658b8) => (_0x178e43['minPull'] || 0x0) - (_0x3658b8['minPull'] || 0x0));
    let _0x50b060 = _0x2ad685[0x0] || {
        'minPull': 0x0,
        'maxPull': Infinity,
        'perPullPrice': 0.8
    };
    for (const _0x2d8ba5 of _0x2ad685) {
        const _0x2b54ff = _0x2d8ba5['minPull'] != null ? _0x2d8ba5['minPull'] : 0x0, _0xccc23f = _0x2d8ba5['maxPull'] == null || _0x2d8ba5['maxPull'] === Infinity ? Infinity : _0x2d8ba5['maxPull'];
        if (_0x2a2f80 >= _0x2b54ff && _0x2a2f80 < _0xccc23f) {
            _0x50b060 = {
                ..._0x2d8ba5,
                'minPull': _0x2b54ff,
                'maxPull': _0xccc23f
            };
            break;
        }
    }
    const _0x29d022 = _0x2a2f80 * _0x50b060['perPullPrice'], _0x31e67a = _0x50b060['maxPull'] == null || _0x50b060['maxPull'] === Infinity ? Infinity : _0x50b060['maxPull'], _0x53568d = _0x31e67a === Infinity ? _0x50b060['minPull'] + '抽+' : _0x50b060['minPull'] + '~' + _0x31e67a + '抽';
    return {
        'pulls': Math['round'](_0x2a2f80),
        'perPull': _0x50b060['perPullPrice'],
        'tierLabel': _0x53568d,
        'total': Math['round'](_0x29d022)
    };
}
function getYellowCoeff(_0x33e8a3) {
    const _0x21edd6 = weights && weights['yellowTiers'] || DEFAULT_YELLOW_TIERS, _0x5eea1f = {};
    for (const _0x39c735 of _0x21edd6) {
        const _0x26d2e9 = (_0x39c735['minYellow'] || 0x0) + '-' + (_0x39c735['maxYellow'] == null ? 'inf' : _0x39c735['maxYellow']);
        _0x5eea1f[_0x26d2e9] = _0x39c735;
    }
    const _0x58b9ec = Object['values'](_0x5eea1f);
    let _0x2eee82 = _0x58b9ec[0x0] || {
        'minYellow': 0x0,
        'maxYellow': Infinity,
        'coefficient': 0.3
    };
    for (const _0x1e836d of _0x58b9ec) {
        const _0x2313b0 = _0x1e836d['maxYellow'] == null || _0x1e836d['maxYellow'] === Infinity ? Infinity : _0x1e836d['maxYellow'];
        if (_0x33e8a3 >= _0x1e836d['minYellow'] && _0x33e8a3 < _0x2313b0) {
            _0x2eee82 = {
                ..._0x1e836d,
                'maxYellow': _0x2313b0
            };
            break;
        }
    }
    const _0x40efba = _0x2eee82['maxYellow'] === Infinity ? _0x2eee82['minYellow'] + '黄+' : _0x2eee82['minYellow'] + '~' + _0x2eee82['maxYellow'] + '黄';
    return {
        'yellowCount': _0x33e8a3,
        'coefficient': _0x2eee82['coefficient'],
        'tierLabel': _0x40efba
    };
}
function calculateValue(_0x422a7d, _0x59570c) {
    const _0x6a27bb = weights || DEFAULT_WEIGHTS, _0x48a919 = _0x422a7d['weapons']['map'](_0x5db5e7 => _0x5db5e7['name']), _0x1f52ef = _0x422a7d['rawText'] || '', _0xfbd347 = _0x6a27bb['c6TierWeights'] || FULL_CONST_WEIGHT;
    let _0x38cbe9 = 0x0, _0x4ca57a = 0x0;
    const _0x176617 = [], _0x26da79 = [], _0x13b3d0 = [];
    for (const _0x3fd03b of _0x422a7d['characters']) {
        const _0x53c8b6 = checkHasSigWeapon(_0x3fd03b['name'], _0x48a919, _0x1f52ef), _0x2b6635 = getCharValue(_0x3fd03b, _0x53c8b6, _0x6a27bb), _0x3f2419 = calcConstPremium(_0x3fd03b['name'], _0x3fd03b['const'], _0x6a27bb);
        _0x38cbe9 += _0x2b6635 + _0x3f2419;
        if (_0x53c8b6 && !_0x13b3d0['includes'](_0x3fd03b['name']))
            _0x13b3d0['push'](_0x3fd03b['name']);
        let _0x348842 = 0x0;
        _0x3fd03b['const'] >= 0x6 && (_0x348842 = _0xfbd347[_0x3fd03b['tier']] != null ? _0xfbd347[_0x3fd03b['tier']] : FULL_CONST_WEIGHT[_0x3fd03b['tier']] || 0x0, _0x4ca57a += _0x348842);
        let _0x3189a8 = 0x0;
        if (_0x53c8b6) {
            const _0x551f04 = _sigWeaponsOverride ? _sigWeaponsOverride[_0x3fd03b['name']] || SIG_WEAPONS[_0x3fd03b['name']] : SIG_WEAPONS[_0x3fd03b['name']];
            if (_0x551f04) {
                const _0x3490c3 = _0x422a7d['weapons']['find'](function (_0x40e6c2) {
                    return _0x40e6c2['name'] === _0x551f04 || _0x40e6c2['name']['includes'](_0x551f04) || _0x551f04['includes'](_0x40e6c2['name']);
                });
                if (_0x3490c3)
                    _0x3189a8 = _0x3490c3['refine'] || 0x1;
            }
        }
        _0x176617['push']({
            'name': _0x3fd03b['name'],
            'const': _0x3fd03b['const'],
            'tier': _0x3fd03b['tier'],
            'isHot': !!_0x3fd03b['isHot'],
            'hasSig': _0x53c8b6,
            'sigRefine': _0x3189a8,
            'premium': _0x3f2419,
            'value': Math['round'](_0x2b6635 + _0x3f2419)
        }), _0x26da79['push']({
            'name': _0x3fd03b['name'],
            'const': _0x3fd03b['const'],
            'tier': _0x3fd03b['tier'],
            'hasSig': _0x53c8b6,
            'value': Math['round'](_0x2b6635 + _0x3f2419)
        });
    }
    let _0x49ca30 = 0x0;
    const _0x110e6b = [], _0x6d2c31 = _0x6a27bb['c6MultiBonus'] || [], _0x4bd39b = _0x176617['filter'](_0x1f507e => _0x1f507e['const'] >= 0x6 && _0x1f507e['tier'] && _0x1f507e['tier'] !== 'E'), _0x31c37c = {};
    for (const _0x328987 of _0x4bd39b) {
        _0x31c37c[_0x328987['tier']] = (_0x31c37c[_0x328987['tier']] || 0x0) + 0x1;
    }
    let _0xbbf9d7 = 0x0;
    if (_0x4ca57a >= 0x2 && _0x6d2c31['length'] > 0x0) {
        const _0x520aa2 = [..._0x6d2c31]['sort']((_0x374abe, _0x3e25ef) => _0x374abe['count'] - _0x3e25ef['count']);
        let _0x31dc24 = null, _0x3b3b9d = null;
        for (const _0xc5fa02 of _0x520aa2) {
            if (_0x4ca57a >= _0xc5fa02['count'])
                _0x31dc24 = _0xc5fa02;
            else {
                if (!_0x3b3b9d)
                    _0x3b3b9d = _0xc5fa02;
            }
        }
        if (_0x31dc24 && _0x3b3b9d) {
            const _0x30df9e = (_0x4ca57a - _0x31dc24['count']) / (_0x3b3b9d['count'] - _0x31dc24['count']);
            _0xbbf9d7 = Math['max'](_0x3b3b9d['bonus'] * _0x30df9e, _0x31dc24['bonus']);
        } else
            _0x31dc24 && (_0xbbf9d7 = _0x31dc24['bonus']);
    }
    if (_0xbbf9d7 > 0x0) {
        _0x49ca30 = _0x38cbe9 * _0xbbf9d7;
        const _0x4f6ff0 = Object['entries'](_0x31c37c)['sort']((_0x4dcd36, _0x187781) => (_0xfbd347[_0x4dcd36[0x0]] || 0x0) < (_0xfbd347[_0x187781[0x0]] || 0x0) ? 0x1 : -0x1)['map'](([_0x41e49e, _0x2bb8e0]) => _0x2bb8e0 + '个' + _0x41e49e + '级')['join']('+');
        _0x110e6b['push']('满命(' + _0x4f6ff0 + ')\x20加权' + _0x4ca57a['toFixed'](0x1) + '\x20+' + Math['round'](_0xbbf9d7 * 0x64) + '%');
    }
    const _0x1eef14 = _0x6a27bb['pullC6Bonus'] || [];
    let _0x4c6466 = 0x0;
    if (_0x4ca57a >= 0x1 && _0x1eef14['length'] > 0x0) {
        const _0x285140 = [..._0x1eef14]['sort']((_0x4ff76f, _0x871720) => _0x4ff76f['count'] - _0x871720['count']);
        let _0xd18ffa = null, _0x3a47cc = null;
        for (const _0x2cd22e of _0x285140) {
            if (_0x4ca57a >= _0x2cd22e['count'])
                _0xd18ffa = _0x2cd22e;
            else {
                if (!_0x3a47cc)
                    _0x3a47cc = _0x2cd22e;
            }
        }
        if (_0xd18ffa && _0x3a47cc) {
            const _0x283be0 = (_0x4ca57a - _0xd18ffa['count']) / (_0x3a47cc['count'] - _0xd18ffa['count']);
            _0x4c6466 = Math['max'](_0x3a47cc['bonus'] * _0x283be0, _0xd18ffa['bonus']);
        } else
            _0xd18ffa && (_0x4c6466 = _0xd18ffa['bonus']);
    }
    let _0x353e54 = 0x0;
    const _0x40cd89 = [], _0x472cbd = new Set(_0x422a7d['characters']['map'](_0x47fcfa => _0x47fcfa['name'])), _0x38326a = weights && weights['teams'] || DEFAULT_TEAMS, _0x321445 = [];
    for (const _0x4754d6 of _0x38326a) {
        const _0x1eff6e = _0x4754d6['members']['every'](_0x586c1f => _0x472cbd['has'](_0x586c1f));
        if (_0x1eff6e)
            _0x321445['push'](_0x4754d6);
    }
    const _0x2cfef3 = _0x6a27bb['teamMultiBonus'] || [], _0x1aaad1 = {};
    for (const _0x5a9efa of _0x2cfef3) {
        _0x1aaad1[_0x5a9efa['count']] = _0x5a9efa;
    }
    const _0x541d80 = Object['values'](_0x1aaad1);
    let _0x9c3ccd = 0x1;
    for (const _0x533f48 of _0x541d80) {
        _0x321445['length'] >= _0x533f48['count'] && (_0x9c3ccd = Math['max'](_0x9c3ccd, _0x533f48['coef']));
    }
    for (const _0x2c557d of _0x321445) {
        for (const _0x3f5dc3 of _0x2c557d['members']) {
            const _0x51e6b5 = _0x422a7d['characters']['find'](_0x36790f => _0x36790f['name'] === _0x3f5dc3);
            if (_0x51e6b5) {
                const _0x476743 = checkHasSigWeapon(_0x3f5dc3, _0x48a919, _0x1f52ef), _0x305793 = getCharValue(_0x51e6b5, _0x476743, _0x6a27bb);
                _0x353e54 += _0x305793 * (_0x2c557d['multiplier'] - 0x1);
            }
        }
    }
    _0x353e54 *= _0x9c3ccd;
    if (_0x321445['length'] > 0x0) {
        const _0xa27011 = _0x321445['map'](_0x1b73e9 => _0x1b73e9['name'])['join']('/');
        _0x40cd89['push'](_0x321445['length'] + '配队(' + _0xa27011 + ')\x20×' + _0x9c3ccd);
    }
    const _0x25ad78 = calculatePullValue(_0x422a7d['pulls']), _0x327279 = _0x25ad78['total'], _0x1cb3e8 = Math['round'](_0x327279 * _0x4c6466), _0x1e6265 = _0x327279 + _0x1cb3e8, _0x586da3 = extractListItems(_0x422a7d['rawText'], '服饰'), _0x3ebff6 = extractListItems(_0x422a7d['rawText'], '摩托饰品')['concat'](extractListItems(_0x422a7d['rawText'], '摩托')), _0x4cb26e = extractListItems(_0x422a7d['rawText'], '车架模组')['concat'](extractListItems(_0x422a7d['rawText'], '车架')), _0x3d7f35 = extractListItems(_0x422a7d['rawText'], '涂装'), _0x1d4f40 = _0x586da3['length'] * (_0x6a27bb['outfit'] || 0x0), _0x1a9a88 = _0x3ebff6['length'] * (_0x6a27bb['motoAccessory'] || 0x0), _0x5ed8aa = _0x4cb26e['length'] * (_0x6a27bb['motoFrame'] || 0x0), _0x189e7d = _0x3d7f35['length'] * (_0x6a27bb['paint'] || 0x0), _0x21c50a = _0x1d4f40 + _0x1a9a88 + _0x5ed8aa + _0x189e7d, _0x526532 = _0x422a7d['weapons']['map'](_0x484d88 => {
            const _0x3f420f = _0x422a7d['characters']['some'](_0x2e8c0e => {
                const _0x1a421a = _sigWeaponsOverride ? _sigWeaponsOverride[_0x2e8c0e['name']] || SIG_WEAPONS[_0x2e8c0e['name']] : SIG_WEAPONS[_0x2e8c0e['name']];
                return _0x1a421a === _0x484d88['name'] && _0x13b3d0['includes'](_0x2e8c0e['name']);
            });
            return {
                'name': _0x484d88['name'],
                'refine': _0x484d88['refine'],
                'isSig': _0x3f420f
            };
        }), _0x58061a = getYellowCoeff(_0x422a7d['yellowCount']), _0x5a60d1 = _0x58061a['coefficient'], _0x12d1fe = (_0x422a7d['rawText'] || '')['match'](/(\d+)级/), _0x4b6e2f = _0x12d1fe ? parseInt(_0x12d1fe[0x1]) : 0x1, _0x26e35e = (_0x422a7d['rawText'] || '')['match'](/(\d+)个四星角色/), _0xac252 = _0x26e35e ? parseInt(_0x26e35e[0x1]) : 0x0, _0x35cd49 = _0x422a7d['characters']['length'], _0x59bb1a = _0x422a7d['characters']['filter'](_0x2dfb2a => _0x2dfb2a['const'] >= 0x6)['length'], _0x46ee55 = _0x38cbe9 + _0x49ca30 + _0x353e54 + _0x1e6265 + _0x21c50a;
    let _0x534247 = 0x1;
    const _0x48698a = [], _0x55a1c4 = _0x6a27bb['flatDiscountRules'] || [];
    if (_0x55a1c4['length'] > 0x0)
        for (const _0x4a421d of _0x55a1c4) {
            if (!_0x4a421d['tiers'] || _0x4a421d['tiers']['length'] === 0x0)
                continue;
            const _0xb29b9c = _0x422a7d['characters']['filter'](_0xfc8ecd => _0x4a421d['tiers']['includes'](_0xfc8ecd['tier']));
            if (_0xb29b9c['length'] === 0x0)
                continue;
            const _0x79f2fb = _0xb29b9c['every'](_0x146f33 => _0x146f33['const'] <= _0x4a421d['maxConst']);
            if (_0x79f2fb) {
                _0x534247 = Math['min'](_0x534247, _0x4a421d['discount']);
                const _0x301ca9 = _0xb29b9c['map'](_0x449280 => _0x449280['name'] + _0x449280['const'] + '命')['join']('/');
                _0x48698a['push']('低命折扣系数(' + _0x4a421d['tiers']['join']('+') + '级全≤' + _0x4a421d['maxConst'] + '命:\x20' + _0x301ca9 + ')\x20×' + _0x4a421d['discount']);
            }
        }
    const _0x52a147 = Math['min'](_0x5a60d1, _0x534247), _0x4210d2 = _0x46ee55 * _0x52a147, _0x1fd5b9 = _0x59570c > 0x0 ? (_0x4210d2 - _0x59570c) / _0x59570c * 0x64 : 0x0, _0x16d7b3 = Math['round']((_0x4210d2 - _0x59570c) * 0x64) / 0x64;
    return {
        'totalValue': Math['round'](_0x4210d2 * 0x64) / 0x64,
        'diff': _0x16d7b3,
        'charValue': Math['round'](_0x38cbe9 * 0x64) / 0x64,
        'fullConstPremium': Math['round'](_0x49ca30 * 0x64) / 0x64,
        'teamPremium': Math['round'](_0x353e54 * 0x64) / 0x64,
        'pullValue': Math['round'](_0x1e6265 * 0x64) / 0x64,
        'otherResources': _0x21c50a,
        'yellowCoeff': _0x5a60d1,
        'weightedFullConst': _0x4ca57a,
        'satisfiedTeams': _0x321445['map'](_0x46a279 => _0x46a279['name']),
        'ratio': Math['round'](_0x1fd5b9 * 0xa) / 0xa,
        'charBreakdown': _0x176617,
        'charDetails': _0x26da79,
        'hasSignatureWeapons': _0x13b3d0,
        'weaponDetails': _0x526532,
        'matchedTeams': _0x321445,
        'c6Bonus': {
            'value': Math['round'](_0x49ca30),
            'notes': _0x110e6b
        },
        'teamBonus': {
            'value': Math['round'](_0x353e54),
            'notes': _0x40cd89
        },
        'flatDiscount': {
            'value': _0x534247,
            'notes': _0x48698a
        },
        'pullInfo': {
            'pulls': _0x25ad78['pulls'],
            'perPull': _0x25ad78['perPull'],
            'tierLabel': _0x25ad78['tierLabel'],
            'baseTotal': Math['round'](_0x327279 * 0x64) / 0x64,
            'c6Bonus': _0x1cb3e8,
            'c6Multiplier': _0x4c6466,
            'total': _0x1e6265
        },
        'yellowInfo': _0x58061a,
        'outfits': _0x586da3,
        'motoAccessories': _0x3ebff6,
        'motoFrames': _0x4cb26e,
        'paints': _0x3d7f35,
        'level': _0x4b6e2f,
        'fourStarChars': _0xac252,
        'fiveStarChars': _0x35cd49,
        'maxConstChars': _0x59bb1a
    };
}
function evaluateWithPrice(_0x4d094e, _0x179f8d, _0x172169) {
    const _0x9cd8ea = weights, _0x5e20f0 = _sigWeaponsOverride;
    _0x172169 && (weights = buildDefaultWeights(_0x172169), _sigWeaponsOverride = weights['sigWeaponsOverride'] || null);
    try {
        const _0x3aca4f = parseAccountInfo(_0x4d094e), _0x1ec045 = _0x179f8d / 0x64, _0xa67bba = calculateValue(_0x3aca4f, _0x1ec045);
        let _0x31414d = 0x0;
        _0x1ec045 > 0x0 && (_0x31414d = (_0xa67bba['totalValue'] - _0x1ec045) / _0x1ec045 * 0x64);
        _0x31414d = Math['round'](_0x31414d * 0x64) / 0x64;
        const _0x446b35 = {
                'characters': _0x3aca4f['characters'],
                'weapons': _0x3aca4f['weapons'],
                'starSounds': _0x3aca4f['starSound'],
                'moonPhases': _0x3aca4f['moonPhase'],
                'coral': _0x3aca4f['aftermathCoral'],
                'goldenRipples': _0x3aca4f['floatGoldRipple'],
                'tideRipples': _0x3aca4f['castTideRipple'],
                'yellowCount': _0x3aca4f['yellowCount'],
                'outfits': _0x3aca4f['outfitCount'],
                'motorcycles': _0x3aca4f['motoCount'],
                'pulls': _0x3aca4f['pulls'],
                'rawText': _0x3aca4f['rawText']
            }, _0x43fed2 = {
                ..._0xa67bba,
                'finalValue': _0xa67bba['totalValue'],
                'characterValue': _0xa67bba['charValue'],
                'c6Premium': _0xa67bba['fullConstPremium'],
                'teamPremium': _0xa67bba['teamPremium'],
                'pullValue': _0xa67bba['pullValue'],
                'resourceValue': _0xa67bba['otherResources'],
                'yellowMultiplier': _0xa67bba['yellowCoeff'],
                'characters': _0xa67bba['charBreakdown']
            };
        return {
            'info': _0x446b35,
            'details': _0x43fed2,
            'priceInYuan': _0x1ec045,
            'costPerformance': _0x31414d
        };
    } finally {
        weights = _0x9cd8ea, _sigWeaponsOverride = _0x5e20f0;
    }
}
function generateShortDescription(_0x4a0bd4) {
    const _0x436090 = _0x4a0bd4['details'] && _0x4a0bd4['details']['characters'] || [];
    if (_0x436090['length'] === 0x0)
        return '无已知角色';
    const _0xe45f0a = [..._0x436090]['sort']((_0x2e8690, _0x498a8c) => _0x498a8c['value'] - _0x2e8690['value'])['slice'](0x0, 0x5), _0x273c23 = _0xe45f0a['map'](_0x31c2ef => {
            const _0x108412 = _0x31c2ef['const'] >= 0x6 ? '满命' : _0x31c2ef['const'] + '命', _0x5b5130 = _0x31c2ef['hasSig'] ? '+专武' : '';
            return '' + _0x108412 + _0x31c2ef['name'] + _0x5b5130;
        });
    let _0x430404 = _0x273c23['join'](',\x20');
    const _0xe48333 = _0x4a0bd4['info'] && _0x4a0bd4['info']['yellowCount'];
    return _0xe48333 > 0x0 && (_0x430404 += '\x20|\x20' + _0xe48333 + '黄'), _0x430404;
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