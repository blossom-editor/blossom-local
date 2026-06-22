<template>
  <div class="header">
    <AppHeader simple></AppHeader>
  </div>
  <div class="article-view-window-root">
    <div class="preview bl-preview" :style="editorStyle" v-html="articleHtml" ref="WindowPreviewRef" style="margin-right: 5px"></div>
    <el-backtop target=".preview" :right="350" :bottom="50">
      <div class="iconbl bl-a-doubleonline-line backtop"></div>
    </el-backtop>

    <!-- the toc -->
    <div class="bl-preview-toc-block">
      <div class="doc-info">
        <div class="doc-name">《{{ article?.name }}》</div>
        <div class="doc-subtitle"><span class="iconbl bl-a-clock3-line"></span> 修改 {{ article?.updTime }}</div>
        <div class="toc-title">目录</div>
      </div>
      <div class="toc-content">
        <div v-for="toc in tocs" :key="toc.id" :class="['toc-item', toc.clazz]" @click="toScroll(toc.id)">
          {{ toc.content }}
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="articleReferenceView.show" ref="ArticleViewRef" class="article-view-absolute" :style="articleReferenceView.style">
      <div class="content-view" :style="editorStyle">
        {{ articleReferenceView.html }}
      </div>
      <bl-row v-if="articleReferenceView.articleId !== '' && articleReferenceView.path !== ''" class="workbench" just="space-between">
        <div class="btns">
          <div @click="openFileLocation(articleReferenceView.path)">查看原文件</div>
        </div>
        <div class="infos">{{ articleReferenceView.name }}</div>
      </bl-row>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ref, onMounted, nextTick } from 'vue'
import { Local } from '@renderer/assets/utils/storage'
import { useConfigStore } from '@renderer/stores/config'
import { DOC_LIB_CUR_KEY, useDocLibStore } from '@renderer/stores/docLib'
import { docTreeApi } from '@renderer/api/docLib'
import { openFileLocation } from '@renderer/api/docLib'
import { articleInfoApi } from '@renderer/api/blossom'
import { parseTocAsync } from './scripts/article'
import { isHttp } from '@renderer/assets/utils/util'
import { protocolWrapper } from '../picture/scripts/picture'
import type { Toc } from './scripts/article'
import marked, { renderBlockquote, renderCode, renderCodespan, renderHeading, renderImage, renderTable, renderLink } from './scripts/markedjs'
import { useArticleHtmlEvent } from './scripts/article-html-event'
import AppHeader from '@renderer/components/AppHeader.vue'

const docLibSotre = useDocLibStore()
const configStore = useConfigStore()
const { editorStyle } = storeToRefs(configStore)

onMounted(() => {
  const docLib = Local.get(DOC_LIB_CUR_KEY)
  docLibSotre.setCurDoc(docLib)
  initPreview(route.query.articleId as string)
})

const route = useRoute()
const article = ref<DocInfo>()
const tocs = ref<Toc[]>([])
const WindowPreviewRef = ref()
const docTree = ref<DocTree[]>([])

/**
 * 跳转至指定ID位置,ID为 标题级别-标题内容
 * @param level 标题级别
 * @param content 标题内容
 */
const toScroll = (id: string) => {
  let elm: HTMLElement = document.getElementById(id) as HTMLElement
  ;(elm.parentNode as Element).scrollTop = elm.offsetTop - 40
}

const initPreview = (articleId: string) => {
  articleInfoApi({ id: articleId }).then((resp) => {
    article.value = resp.data
    document.title = `《${resp.data!.name}》`
    docTreeApi({ type: 'ARTICLE' }).then((tree) => {
      docTree.value = tree.data!
      nextTick(() => {
        parse(article.value!.markdown!)
      })
    })
  })
}

//#region ----------------------------------------< marked/preview >-------------------------------
const articleHtml = ref('') // 解析后的 html 内容
const renderAsync = ref({ need: 0, done: 0 })
/**
 * 自定义渲染
 */
const renderer = {
  table(header: string, body: string): string {
    return renderTable(header, body)
  },
  blockquote(quote: string): string {
    return renderBlockquote(quote)
  },
  codespan(src: string): string {
    return renderCodespan(src)
  },
  code(code: string, language: string | undefined, _isEscaped: boolean): string {
    return renderCode(code, language, _isEscaped, renderAsync.value)
  },
  heading(text: string, level: number, raw: string): string {
    return renderHeading(text, level, raw)
  },
  image(href: string | null, title: string | null, text: string): string {
    if (!isHttp(href)) href = protocolWrapper(href as string)
    return renderImage(href, title, text)
  },
  link(href: string, title: string | null | undefined, text: string): string {
    return renderLink(href, title, text, docTree.value)
  }
}

marked.use({ renderer: renderer })

/**
 * 解析 markdown 为 html, 并将 html 赋值给 articleHtml
 */
const parse = (markdown: string) => {
  let mdContent = markdown
  renderAsync.value = { need: 0, done: 0 }
  marked
    .parse(mdContent, { async: true })
    .then((content: string) => {
      articleHtml.value = content
    })
    .then(() => {
      nextTick(() => {
        parseTocAsync(WindowPreviewRef.value).then((toc) => {
          tocs.value = toc
        })
      }).then(() => {})
    })
}

//#endregion

const ArticleViewRef = ref()
const { articleReferenceView } = useArticleHtmlEvent(ArticleViewRef)
</script>
<style scoped lang="scss">
@import './styles/bl-preview-toc.scss';
@import './styles/article-backtop.scss';
@import './styles/article-view-absolute.scss';

.header {
  @include box(100%, 30px);
}

.article-view-window-root {
  @include box(100%, calc(100% - 30px));
  @include flex(row, center, center);

  .preview {
    @include box(100%, 100%);
    font-size: 15px;
    padding: 30px;
    overflow-y: scroll;
    overflow-x: hidden;
    line-height: 23px;

    :deep(*) {
      font-size: inherit;
      font-family: inherit;
    }

    :deep(.katex > *) {
      font-size: 1.2em !important;
      font-family: 'KaTeX_Size1', sans-serif !important;
    }
  }
}
</style>
