import { invoke } from './ipc-wrapper'

/**
 * 通用文件选择框, 用于选择图片等
 */
export const selectPicAndMoveDialog = (params: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('select-pic-and-move-dialog', params)
}

/**
 * 通用文件选择框, 用于选择图片等
 */
export const fileBuffSave = (params: FileBuffSaveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('file-buffer-save', params)
}

/**
 * 图片分页
 */
export const pictureListApi = (params: PictureListReq): Promise<R<PictureListRes>> => {
  return invoke('picture-list', params)
}

/**
 * 获取图片信息的异步方法
 */
export const pictureInfoApi = (req: { filename: string }): Promise<R<Picture>> => {
  return invoke('picture-info', req)
}

/**
 * 修改文件夹名称
 */
export const pictureUpdNameApi = (params: RenameFileReq): Promise<R<any>> => {
  return invoke('picture-rename-file', params)
}
