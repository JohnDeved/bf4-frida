import { Game } from './Classes/Game.js'
import { Color } from './Helper/Color.js'
import { Utils } from './Helper/Utils.js'
import type { Player } from './Classes/Player.js'
import { SoldierEntity } from './Classes/SoldierEntity.js'
import { VehicleEntity } from './Classes/VehicleEntity.js'
console.log(Color.green('[info]: agent loaded'))

const game = new Game()

let screenShotHappening = false
let benchmarkCount = 0
let skippedFrames = 0
let heartBeat = Date.now()

function continueRender (...args: Parameters<typeof render>) {
  benchmarkCount++
  const wait = Math.max(/* 1000ms / 144 = ~6 */ 5 - (Date.now() - heartBeat), 0)
  skippedFrames += wait
  setTimeout(() => { render(...args) }, wait)
}

function spot (player: Player) {
  const entity = player.entity
  if (!entity || Utils.isInvalidPtr(entity.ptr)) return

  const spotType = entity.spotType
  if (!spotType || spotType === 'active') return entity
  entity.spotType = 'active'

  console.log(spotType, '-> active [', player.name, entity instanceof VehicleEntity ? `: ${entity.vehicleName ?? 'unknown'} ]` : ']')
  return entity
}

function paintTarget (player: Player) {
  const aimTarget = player.soldier?.weapon?.targetEntity
  if (aimTarget && aimTarget instanceof SoldierEntity) {
    if (!aimTarget.player || aimTarget.player.teamId === player.teamId) return
    if (aimTarget.renderFlags === 5) return aimTarget
    aimTarget.renderFlags = 5
    return aimTarget
  }
}

function render (): void {
  const throttle = Date.now()
  heartBeat = throttle

  if (screenShotHappening) {
    if (!game.isScreenShotting) {
      console.log(Color.yellow('[info]: screenshot done'))
      screenShotHappening = false
    }

    continueRender()
    return
  }

  const playerLocal = game.playerLocal
  const localTeamId = playerLocal.teamId
  const players = game.players
  const playerLocalWeapon = playerLocal.soldier?.weapon
  const playerLocalWeaponName = playerLocalWeapon?.name
  const activeEntities: Array<SoldierEntity | VehicleEntity> = []
  const paintedTargets: SoldierEntity[] = []
  const painted = paintTarget(playerLocal)
  const isWeaponPrimaryOrSecondary = playerLocalWeapon?.isPrimaryOrSecondary()

  if (isWeaponPrimaryOrSecondary) {
    const sway = playerLocalWeapon?.getWeaponSway
    if (sway) {
      if (sway.isModified) {
        if (sway.isDefaultData()) {
          console.log(Color.yellow('[info]: sway reset'))
          sway.isModified = false
        }
      }

      if (!sway.isModified) {
        sway.data = [0.3, 0.3, 0.3, 0.3]
        sway.isModified = true
      }
    }
  }

  for (const player of players) {
    if (Utils.isInvalidPtr(player.ptr)) continue
    if (localTeamId === player.teamId) continue

    const spotted = spot(player)
    if (spotted) activeEntities.push(spotted)

    if (playerLocalWeaponName === 'Knife') {
      const soldier = player.soldier
      if (!soldier) continue
      const renderFlags = soldier.renderFlags

      if (renderFlags !== 5) {
        soldier.renderFlags = 5
        soldier.allowRenderTroughWalls = true
      }

      paintedTargets.push(soldier)
    }
  }

  if (playerLocalWeaponName !== 'Knife') {
    for (let instance = Utils.getFirstInstanceOf('ClientSoldierEntity'); Utils.isValidPtr(instance?.ptr); instance = instance.nextInstance) {
      if (instance instanceof SoldierEntity) {
        if (painted && instance.ptr.equals(painted.ptr)) continue

        if (instance.renderFlags === 5) {
          instance.renderFlags = 0
        }
      }
    }
  }

  if (game.isScreenShotting) {
    screenShotHappening = true
    console.log(Color.yellow('[info]: screenshot cleanup'))

    for (const entity of activeEntities) {
      entity.spotType = 'none'
    }

    for (const entity of paintedTargets) {
      if (entity.renderFlags === 5) {
        entity.renderFlags = 0
      }
    }

    if (painted) painted.renderFlags = 0
    continueRender()
    return
  }

  continueRender()
}

setInterval(() => {
  console.log(Color.gray('running at', String(benchmarkCount), '/', String(benchmarkCount + skippedFrames), 'fps'))
  benchmarkCount = 0
  skippedFrames = 0

  if (heartBeat + 1000 <= Date.now()) {
    console.log(Color.red('[error]: restoring main loop'))
    render()
  }
}, 1000)

render()
