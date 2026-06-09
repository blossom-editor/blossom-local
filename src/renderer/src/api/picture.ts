import { invoke } from './ipc-wrapper'

/**
 * 图片分页
 * @param params
 * @returns
 */
export const pictureListApi = (params: PictureListReq): Promise<R<PictureListRes>> => {
  return invoke('picture-list', params)
}
