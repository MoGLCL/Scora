const fs=require("fs"),path=require("path"),mysql=require("mysql2/promise");
const env=path.join(__dirname,"..",".env.local");if(fs.existsSync(env))for(const line of fs.readFileSync(env,"utf8").split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!(m[1]in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,"")}
async function main(){const c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,multipleStatements:true});await c.query(`
ALTER TABLE developer_assessment_sessions
  ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 3600,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS current_phase ENUM('assessment','interview','completed') NOT NULL DEFAULT 'assessment',
  ADD COLUMN IF NOT EXISTS current_question_public_id VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS interview_duration_seconds INT NOT NULL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS interview_expires_at TIMESTAMP NULL;
ALTER TABLE developer_assessment_answers
  DROP INDEX uq_answer_question,
  ADD UNIQUE KEY uq_answer_question_developer(question_id,developer_id),
  MODIFY answer_text MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS draft_text MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS answer_type ENUM('text','mcq','code','voice') NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS client_state_json JSON NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
CREATE TABLE IF NOT EXISTS developer_interview_rounds(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 session_id BIGINT UNSIGNED NOT NULL,
 public_id VARCHAR(80) NOT NULL,
 position INT NOT NULL,
 question_text TEXT NOT NULL,
 response_transcript MEDIUMTEXT NULL,
 audio_url VARCHAR(500) NULL,
 ai_analysis_json JSON NULL,
 asked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 answered_at TIMESTAMP NULL,
 UNIQUE KEY uq_interview_public(public_id),
 UNIQUE KEY uq_interview_position(session_id,position),
 CONSTRAINT fk_interview_session FOREIGN KEY(session_id) REFERENCES developer_assessment_sessions(id) ON DELETE CASCADE
);
UPDATE developer_assessment_sessions SET expires_at=DATE_ADD(started_at,INTERVAL duration_seconds SECOND) WHERE expires_at IS NULL AND status='in_progress';
`);await c.end();console.log("Assessment persistence/interview migration complete")}
main().catch(e=>{console.error(e);process.exit(1)});
