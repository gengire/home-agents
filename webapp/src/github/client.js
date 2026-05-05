import { Octokit } from '@octokit/rest'

let octokitInstance = null

export function initOctokit(token) {
  octokitInstance = new Octokit({ auth: token })
}

export function getOctokit() {
  return octokitInstance
}

function parseRepo(repo) {
  const [owner, repoName] = repo.split('/')
  return { owner, repo: repoName }
}

export async function getFile(repo, path) {
  const octokit = getOctokit()
  const { owner, repo: repoName } = parseRepo(repo)
  const response = await octokit.rest.repos.getContent({
    owner,
    repo: repoName,
    path,
  })
  const base64 = response.data.content.replace(/\n/g, '')
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const content = new TextDecoder('utf-8').decode(bytes)
  return { content, sha: response.data.sha }
}

export async function updateFile(repo, path, content, sha, commitMessage) {
  const octokit = getOctokit()
  const { owner, repo: repoName } = parseRepo(repo)
  const encodedContent = btoa(unescape(encodeURIComponent(content)))
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path,
    message: commitMessage,
    content: encodedContent,
    sha,
  })
}

export async function listFiles(repo, path) {
  const octokit = getOctokit()
  const { owner, repo: repoName } = parseRepo(repo)
  const response = await octokit.rest.repos.getContent({
    owner,
    repo: repoName,
    path,
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function testConnection(token, repo) {
  const testOctokit = new Octokit({ auth: token })
  const { owner, repo: repoName } = parseRepo(repo)
  await testOctokit.rest.repos.get({ owner, repo: repoName })
  return true
}
