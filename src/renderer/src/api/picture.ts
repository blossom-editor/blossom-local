import { invoke } from './ipc-wrapper'

/**
 * 选择文件并移动到指定位置
 */
export const selectPicAndMoveDialog = (req: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('select-pic-and-move-dialog', req)
}

/**
 * 选择多个文件并移动到指定位置
 */
export const selectMultiPicAndMoveDialog = (req: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('select-multi-pic-and-move-dialog', req)
}

/**
 * 通过文件缓冲保存图片
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
 */
export const pictureDeleteBatchApi = (req: PictureDeleteBatchReq): Promise<R<PictureDeleteBatchRes>> => {
  return invoke('picture-delete-batch', req)
}

/**
 * 移动图片
 */
export const pictureMoveBatchApi = (req: PictureMoveBatchReq): Promise<R<DocTree[]>> => {
  return invoke('picture-move-batch', req)
}
