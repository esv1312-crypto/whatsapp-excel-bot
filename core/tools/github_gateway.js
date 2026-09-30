const {GitHubReader}=require('./github_reader');
const {GitHubWriter}=require('./github_writer');

class GitHubGateway {
  constructor(options={}) {
    if (typeof options.fetch !== 'function') throw new Error('GitHubGateway requires fetch function');
    this.reader=new GitHubReader({fetch:options.fetch});
    this.writer=new GitHubWriter({
      updateFile:options.updateFile,
      createFile:options.createFile
    });
  }

  tools() {
    return [...this.reader.tools(), ...this.writer.tools()];
  }
}

module.exports={GitHubGateway};
