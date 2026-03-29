from odoo import fields, models


class BakkiTaskTemplate(models.Model):
    _name = 'bakki.task_template'
    _description = 'Bakki task template'
    _order = 'name'

    name = fields.Char(string='Template Name', required=True, index=True)
    task_type = fields.Selection(
        selection=[
            ('planting', 'Planting'),
            ('monitoring', 'Monitoring'),
            ('fertilizing', 'Fertilizing'),
        ],
        string='Task Type',
        required=True,
        default='planting',
        index=True,
    )
    instructions = fields.Html(string='Instructions')
    youtube_url = fields.Char(string='YouTube URL')
    checklist_schema = fields.Json(string='Checklist Schema')
    default_priority = fields.Selection(
        selection=[
            ('0', 'Low'),
            ('1', 'Normal'),
            ('2', 'High'),
            ('3', 'Urgent'),
        ],
        string='Default Priority',
        default='1',
        required=True,
        index=True,
    )
    active = fields.Boolean(string='Active', default=True)
