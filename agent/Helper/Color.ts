import { ColorEnum } from '../Enums/ColorEnum.js'

export class Color {
  static green (...args: string[]) {
    return `${ColorEnum.FgGreen}${args.join(' ')}${ColorEnum.Reset}`
  }

  static red (...args: string[]) {
    return `${ColorEnum.FgRed}${args.join(' ')}${ColorEnum.Reset}`
  }

  static yellow (...args: string[]) {
    return `${ColorEnum.FgYellow}${args.join(' ')}${ColorEnum.Reset}`
  }

  static gray (...args: string[]) {
    return `${ColorEnum.Dim}${args.join(' ')}${ColorEnum.Reset}`
  }
}
