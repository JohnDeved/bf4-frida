const spottingCache: {[key: string]: string | undefined} = {}

enum SpottingEnum {
  none,
  active,
  passive,
  radar,
  unspottable,
}

class SoldierEntity {
  constructor (public ptr: NativePointer) {}

  get spotType () {
    const spotTypePtr = this.ptr.add(0xBF0).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    const typeNum = spotTypePtr.readU8()
    return SpottingEnum[typeNum] as keyof typeof SpottingEnum | undefined
  }

  set spotType (value: keyof typeof SpottingEnum | undefined) {
    if (!value) return

    const spotTypePtr = this.ptr.add(0xBF0).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    spotTypePtr.writeU8(SpottingEnum[value])
  }
}

class VehicleEntity {
  constructor (public ptr: NativePointer) {}

  private findSpottingOffset (name: string) {
    for (let index = 0x510; index <= 0xD80; index += 0x8) {
      const spottingComponentPtr = this.ptr.add(index).readPointer().add(0x0).readPointer()
      if (!spottingComponentPtr.isNull()) continue

      if (spottingComponentPtr.toInt32() === 0x141BB04F0) {
        if (this.name !== name) {
          console.log('!!! vehicle class does not match')
          return
        }

        const offsetHex = index.toString(16)
        console.log('offset for', name, 'found at', offsetHex)
        spottingCache[name] = `0x${offsetHex}`
        return offsetHex
      }
    }
    console.log('!!! offset not found for', name)
  }

  private getSpottingOffsetCache () {
    const name = this.name
    if (!name) return
    let offset = spottingCache[name]
    if (!offset) offset = this.findSpottingOffset(name)
    return offset
  }

  get className () {
    return this.ptr.add(0x30).readPointer().add(0xF0).readPointer().readCString()
  }

  get name () {
    return this.ptr.add(0x30).readPointer().add(0x130).readPointer().readCString()
 
  }

  get spotType () {
    const offset = Number(this.getSpottingOffsetCache())
    if (!offset) return

    const spotTypePtr = this.ptr.add(offset).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    const typeNum = spotTypePtr.readU8()
    return SpottingEnum[typeNum] as keyof typeof SpottingEnum | undefined
  }

  set spotType (value: keyof typeof SpottingEnum | undefined) {
    if (!value) return

    const offset = Number(this.getSpottingOffsetCache())
    if (!offset) return

    const spotTypePtr = this.ptr.add(offset).readPointer().add(0x50)
    if (spotTypePtr.isNull()) return

    spotTypePtr.writeU8(SpottingEnum[value])
  }
}

class Player {
  constructor (public ptr: NativePointer) {}

  get isInVehicle () {
    const entityPtr = this.entity
    if (entityPtr.isNull()) return

    return entityPtr.readU64().toNumber() === 0x141D3D200 // vehicle head ptr
  }

  get isOnFoot () {
    const entityPtr = this.entity
    if (entityPtr.isNull()) return

    return entityPtr.readU64().toNumber() === 0x141E600C0 // soldier head ptr
  }

  get name () {
    return this.ptr.add(0x40).readCString()
  }

  get teamId () {
    return this.ptr.add(0x13CC).readUInt()
  }

  get entity () {
    return this.ptr.add(0x14D0).readPointer()
  }

  get soldier () {
    if (!this.isOnFoot) {
      const entityPtr = this.entity
      if (entityPtr.isNull()) return
      return new SoldierEntity(entityPtr)
    }
  }

  get vehicle () {
    if (this.isInVehicle) {
      const entityPtr = this.entity
      if (entityPtr.isNull()) return
      return new VehicleEntity(entityPtr)
    }
  }
}

class Game {
  readonly context = ptr(0x142670d80).readPointer()

  get playerManager () {
    return this.context.add(0x60).readPointer()
  }
  
  get playerLocal () {
    const playerPtr = this.playerManager.add(0x540).readPointer()
    return new Player(playerPtr)
  }

  get players () {
    const playersPtr = this.playerManager.add(0x548).readPointer()

    const players: Player[] = []

    for (let i = 0; i <= 64; i++) {
      const playerPtr = playersPtr.add(i * 0x8).readPointer()

      if (!playerPtr.isNull()) {
        players.push(new Player(playerPtr))
      }
    }

    return players
  }
}

const game = new Game()


function spotSoldier (player: Player, soldier: SoldierEntity) {
  const spotType = soldier.spotType
  if (!spotType || spotType === 'active') return

  soldier.spotType = 'active'
  console.log(spotType.padEnd(11, ' '), '=> active [', player.name, ']')
}

function spotVehicle (player: Player, vehicle: VehicleEntity) {
  const spotType = vehicle.spotType
  if (!spotType || spotType === 'active') return

  vehicle.spotType = 'active'
  console.log(spotType.padEnd(11, ' '), '=> active [', player.name, ':', vehicle.className, ']')
}

function doSpotting () {
  const localTeamId = game.playerLocal.teamId
  const players = game.players

  for (const player of players) {
    if (localTeamId === player.teamId) continue

    const soldier = player.soldier
    if (soldier) {
      spotSoldier(player, soldier)
      continue
    }

    const vehicle = player.vehicle
    if (vehicle) {
      spotVehicle(player, vehicle)
      continue
    }
  }

  setImmediate(doSpotting)
}

doSpotting()