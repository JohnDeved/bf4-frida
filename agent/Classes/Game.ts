
import { prop } from '../Helper/Decorators.js'
import { Utils } from '../Helper/Utils.js'
import { Player } from './Player.js'

export class Game {
  readonly context = ptr(0x142670d80).readPointer()

  get isScreenShotting () {
    const screenShotClass = ptr(0x14273D6E8).readPointer()
    if (Utils.isInvalidPtr(screenShotClass)) return false

    return !screenShotClass.add(0x10).readS64().equals(-1)
  }

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

      if (Utils.isValidPtr(playerPtr)) {
        players.push(new Player(playerPtr))
      }
    }

    return players
  }
}
