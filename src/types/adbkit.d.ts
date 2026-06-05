/**
 * adbkit 类型声明文件
 * 由于 adbkit 没有官方 TypeScript 类型定义，这里提供基本声明
 */
declare module 'adbkit' {
  export interface Device {
    id: string
    type: string
  }

  export interface Client {
    listDevices(): Promise<Device[]>
    getDevice(serial: string): DeviceClient
    connect(host: string, port?: number): Promise<any>
    disconnect(host: string): Promise<any>
  }

  export interface DeviceClient {
    getProperties(): Promise<Record<string, any>>
    shell(command: string | string[]): Promise<Buffer>
    push(source: string, dest: string): Promise<any>
    screencap(): Promise<NodeJS.ReadableStream>
  }

  export function createClient(options?: { host?: string; port?: number }): Client

  // 允许默认导出
  const adbkit: {
    createClient(options?: { host?: string; port?: number }): Client
  }
  export default adbkit
}
