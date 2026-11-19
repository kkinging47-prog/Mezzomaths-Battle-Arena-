// Source labels, filenames, books, years and uploaded topic columns are deliberately excluded.
export const TOPIC_VERSION=1
export const TOPIC_STRANDS={
 'Counting and number sequences':'Number','Place value':'Number','Addition':'Number','Subtraction':'Number','Multiplication':'Number','Division':'Number','Fractions':'Number','Decimals':'Number','Percentages':'Number','Ratio and proportion':'Number','Integers':'Number','Rounding and estimation':'Number','Factors and multiples':'Number','Powers and roots':'Number','Standard form':'Number','Financial mathematics':'Number',
 'Algebraic expressions':'Algebra','Linear equations':'Algebra','Simultaneous equations':'Algebra','Quadratic equations':'Algebra','Inequalities':'Algebra','Algebraic sequences':'Algebra','Functions and mappings':'Algebra','Graphs and coordinates':'Algebra','Sets':'Algebra',
 'Vectors':'Geometry and measurement','Angles':'Geometry and measurement','Properties of shapes':'Geometry and measurement','Construction and loci':'Geometry and measurement','Transformations':'Geometry and measurement','Symmetry':'Geometry and measurement','Pythagoras theorem':'Geometry and measurement','Trigonometry':'Geometry and measurement','Circle theorems':'Geometry and measurement','Perimeter':'Geometry and measurement','Area':'Geometry and measurement','Surface area':'Geometry and measurement','Volume and capacity':'Geometry and measurement','Length and unit conversions':'Geometry and measurement','Mass and weight':'Geometry and measurement','Time':'Geometry and measurement','Speed distance and time':'Geometry and measurement','Bearings and scale drawings':'Geometry and measurement',
 'Data collection and representation':'Statistics and probability','Averages and range':'Statistics and probability','Probability':'Statistics and probability','Logical reasoning':'Mathematical reasoning'
}
export const TOPICS=Object.keys(TOPIC_STRANDS)
const text=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ')
export function questionContent(row){return {question_text:text(row.question_text||row.question||row.q),options:(Array.isArray(row.options)?row.options.slice(0,4):['a','b','c','d'].map(k=>row['option_'+k]||'')).map(text),question_image_url:text(row.question_image_url||''),option_image_urls:(Array.isArray(row.option_image_urls)?row.option_image_urls.slice(0,4):['a','b','c','d'].map(k=>row['option_'+k+'_image_url']||'')).map(text)}}
export const topicContentKey=row=>JSON.stringify([TOPIC_VERSION,questionContent(row)])
export const classifiedTopic=a=>a&&a.version===TOPIC_VERSION&&TOPICS.includes(a.topic)&&['high','medium'].includes(a.confidence)?a.topic:null
export function topicTotals(answers){const topics={};let classified=0;for(const a of answers){const topic=classifiedTopic(a.topic_analysis);if(!topic)continue;classified++;topics[topic]||={total:0,correct:0};topics[topic].total++;if(a.correct===true)topics[topic].correct++}return {topics,classified,total:answers.length,pending:answers.length-classified}}

// Only explicit mathematical labels qualify. Books, years and general practice
// labels never become teaching recommendations. Reviewed content analysis wins.
const topicLabelAliases={
 'ratio':'Ratio and proportion','inverse proportion':'Ratio and proportion',
 'substitution':'Algebraic expressions','factorization':'Algebraic expressions','factorisation':'Algebraic expressions','change of subject':'Algebraic expressions',
 'linear inequalities':'Inequalities','decimal equations':'Linear equations',
 'fractions and decimals':'Fractions','fraction operations':'Fractions','ordering fractions':'Fractions',
 'indices':'Powers and roots','prime numbers':'Factors and multiples',
 'volume of a cylinder':'Volume and capacity','area of a square':'Area',
 'unit conversion':'Length and unit conversions','bearings':'Bearings and scale drawings',
 'gradient':'Graphs and coordinates','reflection':'Transformations','translation vectors':'Transformations',
 'vector addition':'Vectors','vector arithmetic':'Vectors','displacement vectors':'Vectors',
 'profit':'Financial mathematics','money':'Financial mathematics'
}
export function questionLabelAnalysis(question) {
 const label=String(question.source_topic||question.topic||'').trim().toLowerCase().replace(/\s+/g,' ')
 const topic=TOPICS.find(t=>t.toLowerCase()===label)||topicLabelAliases[label]
 return topic?{version:TOPIC_VERSION,topic,strand:TOPIC_STRANDS[topic],skill:String(question.source_topic||question.topic).trim(),confidence:'medium',status:'classified',source:'question_label'}:null
}
