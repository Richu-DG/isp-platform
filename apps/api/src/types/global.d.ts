declare module 'africastalking' {
  interface AfricasTalkingOptions {
    apiKey: string;
    username: string;
  }
  interface SmsService {
    send(opts: { to: string[]; message: string; from?: string }): Promise<any>;
  }
  interface AfricasTalkingInstance {
    SMS: SmsService;
  }
  function AfricasTalking(opts: AfricasTalkingOptions): AfricasTalkingInstance;
  export = AfricasTalking;
}
