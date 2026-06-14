import { invoke } from './ipc-wrapper'

/**
 * 通用文件选择框, 用于选择图片等
 */
export const selectPicAndMoveDialog = (req: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('select-pic-and-move-dialog', req)
}

/**
 * 通用文件选择框, 用于选择图片等
 */
export const fileBuffSave = (req: FileBuffSaveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('file-buffer-save', req)
}

/**
 * 图片分页
 */
export const pictureListApi = (req: PictureListReq): Promise<R<PictureListRes>> => {
  return invoke('picture-list', req)
}

/**
 * 获取图片信息的异步方法
 */
export const pictureInfoApi = (req: PictureInfoReq): Promise<R<Picture>> => {
  return invoke('picture-info', req)
}

/**
 * 修改文件夹名称
 */
export const pictureRenameApi = (req: RenameFileReq): Promise<R<DocTree[]>> => {
  return invoke('picture-rename', req)
}

/**
 * 删除图片
 * @param params {id:id}
 * @returns
 */
export const pictureDeleteBatchApi = (req: PictureDeleteBatchReq): Promise<R<DocTree[]>> => {
  return invoke('picture-delete-batch', req)
}
