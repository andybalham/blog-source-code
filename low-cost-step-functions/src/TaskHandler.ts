export interface TaskHandler<TReq, TRes> {
  handleRequestAsync(request: TReq): Promise<TRes>;
}
