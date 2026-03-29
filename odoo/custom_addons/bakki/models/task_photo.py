from odoo import fields, models


class BakkiTaskPhoto(models.Model):
    _name = 'bakki.task_photo'
    _description = 'Bakki task photo'
    _order = 'id desc'

    task_id = fields.Many2one('project.task', string='Task', required=True, ondelete='cascade', index=True)
    name = fields.Char(string='Name', required=True, index=True)
    file_name = fields.Char(string='File Name')
    mime_type = fields.Char(string='MIME Type')
    caption = fields.Char(string='Caption')
    object_key = fields.Char(string='Object Key', required=True, index=True)
    storage_provider = fields.Char(string='Storage Provider', default='digitalocean-spaces', required=True)
    storage_bucket = fields.Char(string='Storage Bucket')
    asset_url = fields.Char(string='Asset URL')
    uploaded_at = fields.Datetime(string='Uploaded At', default=fields.Datetime.now, required=True, index=True)
