import { writeText } from '@renderer/assets/utils/electron'
import { Ref, nextTick, onMounted, ref } from 'vue'
import { articleInfoApi } from '@renderer/api/blossom'

type ArticleHtmlEvent = 'COPY_PRE_CODE' | 'ARTICLE_REFERENCE_VIEW' | 'UNKNOWN_INNER_ARTICLE'

const articleViewHeight = 370

export function useArticleHtmlEvent(articleViewRef: Ref<HTMLElement>) {
  const articleReferenceView = ref({
    show: false,
    html: '',
    articleId: '0',
    path: '',
    name: '',
    style: {
      top: '0',
      left: '0',
      width: '100px',
      height: '100px'
    }
  })

  function onHtmlEventDispatch(_t: any, _ty: any, event: any, type: ArticleHtmlEvent, data: any) {
    /*
     复制代码块内容
     */
    if (type === 'COPY_PRE_CODE') {
      let code = document.getElementById(data)
      if (code) {
        writeText(code.innerText)
      }
      return
    }

    function closeView() {
      if (articleViewRef.value) {
        articleViewRef.value.removeEventListener('mouseleave', closeView)
      }
      articleReferenceView.value.show = false
    }

    /*
     打开文章预览
     */
    if (type === 'ARTICLE_REFERENCE_VIEW') {
      event.preventDefault()
      let rect = event.target.getBoundingClientRect()
      let top = rect.top + rect.height + 10
      if (document.body.clientHeight - top < articleViewHeight) {
        top = rect.top - articleViewHeight - 10
      }
      articleReferenceView.value.style = { left: rect.left + 'px', top: top + 'px', width: `30vw`, height: `370px` }

      articleReferenceView.value.show = true
      articleReferenceView.value.articleId = data
      articleReferenceView.value.html = `正在加载文章...`

      nextTick(() => {
        setTimeout(() => articleViewRef.value.addEventListener('mouseleave', closeView), 100)
        articleInfoApi({ id: data }).then((resp) => {
          articleReferenceView.value.html = resp.data!.markdown!.toString()
          articleReferenceView.value.name = resp.data!.name
          articleReferenceView.value.path = resp.data!.path
        })
      })
      return
    }

    if (type === 'UNKNOWN_INNER_ARTICLE') {
      event.preventDefault()
      let rect = event.target.getBoundingClientRect()
      let top = rect.top + rect.height + 10
      if (document.body.clientHeight - top < articleViewHeight) {
        top = rect.top - articleViewHeight - 10
      }
      articleReferenceView.value.style = { left: rect.left + 'px', top: top + 'px', width: `auto`, height: `auto` }

      articleReferenceView.value.articleId = ''
      articleReferenceView.value.show = true
      articleReferenceView.value.html = `未知的文章链接`
      nextTick(() => {
        setTimeout(() => articleViewRef.value.addEventListener('mouseleave', closeView), 100)
      })
      return
    }
  }

  onMounted(() => {
    window.onHtmlEventDispatch = onHtmlEventDispatch
  })

  return { articleReferenceView }
}
