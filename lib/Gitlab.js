'use strict'

const GitlabApi = require('gitlab')

const Gitlab = function (options) {
  this.git = 'gitlab'
  this.api = GitlabApi({
    url: config.get('gitlabApiUrl'),
    token: config.get('gitlabAuthToken'),
  })
}

Gitlab.prototype.readFile = function(path, getFullResponse) {
  const extension = path.split('.').pop()

  return this.api.projects.repository.showFile({
    projectId: this.options.username + '/' + this.options.repository,
    ref: this.options.branch,
    file_path: path,
  }, function(file){
    if (file == null){
      return Promise.reject(errorHandler('GITLAB_READING_FILE'))
    }

    let content = Buffer.from(res.content, 'base64').toString()

    try {
      switch(extension){
        case 'yml':
        case 'yaml':
          content = yaml.safeLoad(content, 'urf-8')
          break

        case 'json':
          content = JSON.parse(content)
          break
      }
      
      return getFullResponse ? {
        content: content,
        file: {
          content: file,
        }
      } : content
    } catch (err) {
      let errorData = {
        err
      }

      if (err.message) {
        errorData.data = err.message
      }

      return Promise.reject(errorHandle('PARSING_ERROR', errorData))
    }
  })
}

Gitab.prototype.writeFile = function (filePath, data, branch, commitTitle) {
  branch = branch || this.options.branch
  commitTitle = commitTitle || 'Add Staticman file'

  return this.api.projects.repository.updateFile({
    projectId: this.options.username + '/' + this.options.repository,
    ref: this.options.branch,
    file_path: path,
    content: Buffer.from(data).toString('base64'),
    commit_message: commitTitle,
    branch: branch,
    encoding: 'base64'
  }).catch(err => {
    return Promise.reject(errorHandler('GITLAB_WRITING_FILE', {err}))
  })
}

// TODO:
Gitlab.prototype.writeFileAndSendPR = function (filePath, data, branch, commitTitle, commitBody) {
  commitTitle = commitTitle || 'Add Staticman file'
  commitBody = commitBody || ''

  return this.api.repos.getBranch({
    user: this.options.username,
    repo: this.options.repository,
    branch: this.options.branch
  }).then(res => {
    return this.api.gitdata.createReference({
      user: this.options.username,
      repo: this.options.repository,
      ref: 'refs/heads/' + branch,
      sha: res.commit.sha
    })
  }).then(res => {
    return this.writeFile(filePath, data, branch, commitTitle)
  }).then(res => {
    return this.api.pullRequests.create({
      user: this.options.username,
      repo: this.options.repository,
      title: commitTitle,
      head: branch,
      base: this.options.branch,
      body: commitBody
    })
  }).catch(err => {
    return Promise.reject(errorHandler('GITHUB_CREATING_PR', {err}))
  })
}

module.exports = Gitlab
