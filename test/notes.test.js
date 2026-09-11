import test from 'node:test'
import assert from 'node:assert/strict'
import { store, isValidAcademicYear } from '../src/store/posts.js'
import { searchIndex } from '../src/store/search.js'
import { rssXml, studyRssXml, sitemapXml } from '../src/render/feed.js'

test('学年格式要求两个连续年份', () => {
  assert.equal(isValidAcademicYear('2026-2027'), true)
  assert.equal(isValidAcademicYear('2026-2028'), false)
  assert.equal(isValidAcademicYear('大一上'), false)
})

test('学习笔记与普通博客流分离，并可按课程和章节归档', () => {
  const slugs = ['test-note-limit', 'test-note-derivative', 'test-note-draft']
  try {
    store.savePost(
      {
        slug: slugs[0], type: 'note', title: '极限', date: '2026-09-10',
        academicYear: '2026-2027', term: 1, course: '高等数学', courseCode: 'MATH101',
        chapter: '第一章', chapterOrder: 1, noteKind: 'lecture', tags: ['数学'], draft: false,
      },
      '极限的定义与例题。',
    )
    store.savePost(
      {
        slug: slugs[1], type: 'note', title: '导数', date: '2026-09-11',
        academicYear: '2026-2027', term: 1, course: '高等数学',
        chapter: '第二章', chapterOrder: 2, noteKind: 'review', tags: ['数学'], draft: false,
      },
      '导数复习。',
    )
    store.savePost(
      {
        slug: slugs[2], type: 'note', title: '未完成', date: '2026-09-12',
        academicYear: '2026-2027', term: 1, course: '高等数学',
        noteKind: 'other', draft: true,
      },
      '草稿。',
    )
    searchIndex.rebuild()

    assert.equal(store.publishedPosts.some((post) => slugs.includes(post.slug)), false)
    assert.deepEqual(store.notes({ course: '高等数学' }).map((note) => note.slug), slugs.slice(0, 2).reverse())
    const archive = store.studyArchive({ year: '2026-2027', term: 1 })
    assert.equal(archive[0].courses[0].count, 2)
    assert.deepEqual(archive[0].courses[0].chapters.map((chapter) => chapter.name), ['第一章', '第二章'])
    assert.equal(store.toListModel(store.getNote(slugs[0])).url, `/notes/${slugs[0]}`)
    assert.equal(store.courses(true).includes('高等数学'), true)
    assert.equal(searchIndex.search('高等数学', 10, { type: 'note' }).some((hit) => hit.post.slug === slugs[0]), true)

    assert.doesNotMatch(rssXml(), new RegExp(slugs[0]))
    assert.match(studyRssXml(), new RegExp(slugs[0]))
    assert.doesNotMatch(studyRssXml(), new RegExp(slugs[2]))
    assert.match(sitemapXml(), new RegExp(`/notes/${slugs[0]}`))
  } finally {
    for (const slug of slugs) store.deletePost(slug)
    searchIndex.rebuild()
  }
})

test('学习笔记元数据由服务端严格校验', () => {
  assert.throws(
    () => store.savePost({ type: 'unknown', title: '错误内容类型' }, ''),
    /内容类型/,
  )
  assert.throws(
    () => store.savePost({ type: 'note', title: '缺少课程', academicYear: '2026-2027', term: 1, noteKind: 'lecture' }, ''),
    /课程名称/,
  )
  assert.throws(
    () => store.savePost({ type: 'note', title: '错误学年', academicYear: '2026-2028', term: 1, course: '数学', noteKind: 'lecture' }, ''),
    /学年格式/,
  )
  assert.throws(
    () => store.savePost({ type: 'note', title: '错误类型', academicYear: '2026-2027', term: 1, course: '数学', noteKind: 'unknown' }, ''),
    /笔记类型/,
  )
})
