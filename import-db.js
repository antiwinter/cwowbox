const rdir = require('recursive-readdir')
const _ = require('underscore')
const log = console.log
const fs = require('fs')
const { info } = require('console')
const ps = require('xml2js').parseString

let db = []

function logx(...x) {
  log(...x)
  process.exit()
}

function parseProc(x) {
  x = x.$
  if (x.name.match(/ATTACK$/)) {
    let d = {
      action: 'ATTACK',
      type: x.name.replace(/_ATTACK/g, ''),
      min: parseInt(x.min),
      max: parseInt(x.max),
      instant: x.instant === 'yes' ? 1 : 0,
      rate: parseFloat(x.rate),
      cd: parseFloat(x.internal_cd),
      coe: x.spell_dmg_coefficient
    }

    for (let k in x) {
      if (k != 'name' && k != 'min' && k != 'max' && k != 'min' && k != 'rate' && k != 'instant' && k != 'internal_cd' && k != 'spell_dmg_coefficient') {
        log('untreated proc key', k, x)
      }
    }

    return d
  } else if (x.name === 'GENERIC_STAT_BUFF') {
    let d = {
      action: 'BUFF',
      type: x.type,
      amount: parseFloat(x.amount),
      instant: x.instant === 'yes' ? 1 : 0,
      rate: parseFloat(x.rate),
      duration: parseFloat(x.duration),
      cd: parseFloat(x.internal_cd),
      melee_only: x.proc_melee_weapon_side == 'yes' ? 1 : 0
    }

    for (let k in x) {
      if (k != 'name' && k != 'type' && k != 'amount' && k != 'rate' && k != 'instant' && k != 'internal_cd' && k != 'duration' && k != 'proc_melee_weapon_side') {
        log('untreated proc key', k, x)
      }
    }


    return d
  }
  else
    log('unrecgonized proc', JSON.stringify(x))
}

function parseItem(x) {
  let a = {
    id: parseInt,
    name: 1,
    icon(x) {
      return x.toLowerCase().replace(/.png$/, '')
    },
    phase: parseInt,
    type: 1,
    slot: 1,
    unique(x) {
      return x === 'no' ? 0 : 1
    },
    req_lvl: parseInt,
    item_lvl: parseInt,
    quality: 1,
    boe(x) {
      return x === 'no' ? 0 : 1
    }, faction: 1
  }
  let d = {
    stat: {
      ARMOR: 0,
      INTELLECT: 0,
      STAMINA: 0,
      AGILITY: 0,
      STRENGTH: 0,
      SPIRIT: 0,

      SPELL_HIT_CHANCE: 0,
      SPELL_CRIT_CHANCE: 0,
      SPELL_DAMAGE: 0,
      SPELL_DAMAGE_FIRE: 0,
      SPELL_DAMAGE_FROST: 0,
      SPELL_DAMAGE_SHADOW: 0,
      SPELL_DAMAGE_NATURE: 0,
      SPELL_DAMAGE_HOLY: 0,
      SPELL_DAMAGE_UNDEAD: 0,
      SPELL_DAMAGE_DEMON: 0,
      SPELL_DAMAGE_ARCANE: 0,

      SPELL_PENETRATION: 0,

      FIRE_RESISTANCE: 0,
      ARCANE_RESISTANCE: 0,
      SHADOW_RESISTANCE: 0,
      NATURE_RESISTANCE: 0,
      FROST_RESISTANCE: 0,
      ALL_RESISTANCE: 0,

      HIT_CHANCE: 0,
      CRIT_CHANCE: 0,
      RANGED_ATTACK_SPEED: 0,
      ATTACK_POWER: 0,
      ATTACK_POWER_UNDEAD: 0,
      ATTACK_POWER_DEMON: 0,
      ATTACK_POWER_BEAST: 0,
      ATTACK_POWER_DRAGONKIN: 0,
      RANGED_ATTACK_POWER: 0,
      FERAL_ATTACK_POWER: 0,

      WEAPON_DAMAGE: 0,

      BLOCK_CHANCE: 0,
      BLOCK_VALUE: 0,
      DODGE_CHANCE: 0,

      HEALTH_PER_5: 0,
      MANA_PER_5: 0,

      PARRY_CHANCE: 0,
      DEFENSE: 0,

      AXE_SKILL: 0,
      SWORD_SKILL: 0,
      MACE_SKILL: 0,
      BOW_SKILL: 0,
      GUN_SKILL: 0,
      CROSSBOW_SKILL: 0,
      DAGGER_SKILL: 0,
      TWOHAND_AXE_SKILL: 0,
      TWOHAND_SWORD_SKILL: 0,
    }
  }

  // if (x.info[0].$.name.match(/Wind/i))
  //   log('in <-', JSON.stringify(x, null, 2))

  for (let k in x) {
    if (k === '$') {
      for (let k1 in x[k]) {
        if (k1 in a) {
          d[k1] = typeof (a[k1]) === 'function' ? a[k1](x[k][k1]) : x[k][k1]
        } else {
          logx('unrecgonized $', k, k1)
        }
      }
    } else if (k === 'info') {
      if (x[k].length > 1) {
        logx('>1 array', k, x[k])
      }

      for (let k1 in x.info[0].$) {
        if (k1 in a) {
          d[k1] = d[k1] = typeof (a[k1]) === 'function' ? a[k1](x.info[0].$[k1]) : x.info[0].$[k1]

        } else {
          logx('unrecgonized info', k, k1)
        }
      }
    } else if (k === 'stats') {
      if (x[k].length > 1) {
        logx('>1 array', k, x[k])
      }
      if (x.stats[0].stat)
        x.stats[0].stat.forEach(st => {
          if (st.$.type in d.stat) {
            if (d.stat[st.$.type]) log('stat duplicate', JSON.stringify(x))
            d.stat[st.$.type] = parseFloat(st.$.value)
          }
          else logx('unrecgonized stat', st.$)
        })
    } else if (k === 'source') {
      if (x[k].length > 1) {
        logx('>1 array', k, x[k])
      }

      d.source = x.source[0].trim()
    } else if (k === 'class_restriction') {
      d.class = x.class_restriction.map(c => c.$.class)
    } else if (k === 'random_affixes') {
      d.affix = x.random_affixes[0].affix.map(c => c.$.id)
    } else if (k === 'special_equip_effect') {
      d.effect = x[k][0].trim()
    } else if (k === 'dmg_range') {
      d.dmg = x[k][0].$
      for (let k1 in d.dmg) d.dmg[k1] = parseFloat(d.dmg[k1])
    } else if (k === 'mutex') {
      d.unique = x[k].map(c => c.$.item_id)
    } else if (k === 'dps') {
      d.dps = x[k][0].$.value
    } else if (k === 'proc') {
      d.proc = x[k][0].spell.map(parseProc)
    } else if (k === 'flavour_text') {
      d.text = x[k][0].trim()
    }

    else log('unrecgonized', k, JSON.stringify(x[k]))

  }

  for (let k in d.stat)
    if (!d.stat[k]) delete d.stat[k]

  // log('out >>', d)

  db.push(d)
  return d
}

rdir('../ClassicSim/Equipment/EquipmentDb', ['equipment_paths.xml',
  'random_affixes.xml', 'set_bonuses.xml'], (err, files) => {
    // logx(_.filter(files, x => x.match(/.xml$/)))
    _.filter(files, x => x.match(/.xml$/)).forEach(f => {
      ps(fs.readFileSync(f, 'utf-8'), (err, x) => {
        // log(JSON.stringify(x, null, 2))



        try {
          for (let k in x) {
            if (typeof (x[k]) != 'object')
              logx(f, k, 'not object', x[k])
            for (let k1 in x[k]) {
              if (!Array.isArray(x[k][k1])) {
                logx(f, k, k1, 'not array', x[k][k1])
              }
              x[k][k1].forEach(parseItem)
            }
          }
        } catch (err) {
          log(err)
          logx('wrong xml', JSON.stringify(x, null, 2))
        }
        // process.exit()
      })
    })

    log('wrting file')
    fs.writeFileSync('./db.json', JSON.stringify(db), 'utf-8')
  })
