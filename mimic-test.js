$(document).ready(function() {
    Mimic.loadDomTemplate('.mimic-template');
    
    var template_cleaned = Mimic.templates.default['test'].replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/</gi, '&lt;').replace(/>/gi, '&gt;').replace(/\{/gi, '&#123;').replace(/\}/gi, '&#125;').replace(/\s+/g, " ");
    //console.log(template_cleaned);
    Mimic.set('data', template_cleaned);
    var template = Mimic.parse('test-template');
    $(document.body).empty().append(template);
    
    
    Mimic.set('list', [{ name: 'eric' }, { name: 'bob' }, { name: 'brianna' }, { name: 'charlie' }]);
    Mimic.set('sublist', [ { name: 'herro' }, { name: 'gurbye' }]);
    Mimic.set('catname', 'sprinkles');
    Mimic.set('dog_name', 'tommy');
    Mimic.set('name', 'eric');
    var test = Mimic.parse('test');

    $(document.body).append(test);
    
});